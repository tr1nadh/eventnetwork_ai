import { FIREWORKS_API_KEY } from '$env/static/private';

/**
 * Generate a 1024-dimension embedding via Fireworks (qwen3-embedding-8b).
 * This is a server-side only helper – never import in client code.
 * @param {string} text
 * @returns {Promise<number[]>} 1024-dimension embedding vector
 */
export async function generateEmbedding(text) {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}

export async function generateEmbeddings(texts) {
  if (!texts.length) return [];
  if (!FIREWORKS_API_KEY) {
    throw new Error('Missing FIREWORKS_API_KEY');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch('https://api.fireworks.ai/inference/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'accounts/fireworks/models/qwen3-embedding-8b',
        input: texts.length === 1 ? texts[0] : texts,
        dimensions: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embedding generation failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const vectors = new Map();
    for (const item of data.data ?? []) {
      const index = item.index ?? (texts.length === 1 ? 0 : undefined);
      if (!Number.isInteger(index) || index < 0 || index >= texts.length ||
          !Array.isArray(item.embedding) || item.embedding.length !== 1024) {
        throw new Error('Invalid embedding index or dimension');
      }
      vectors.set(index, item.embedding);
    }
    if (vectors.size !== texts.length) throw new Error('Incomplete embedding response');
    return texts.map((_, index) => vectors.get(index));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Embedding request timed out after 30 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
