import { FIREWORKS_API_KEY } from '$env/static/private';

/**
 * Generate a 1024-dimension embedding via Fireworks (qwen3-embedding-8b).
 * This is a server-side only helper – never import in client code.
 * @param {string} text
 * @returns {Promise<number[]>} 1024-dimension embedding vector
 */
export async function generateEmbedding(text) {
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
        input: text,
        dimensions: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embedding generation failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding ?? [];

    if (!Array.isArray(embedding) || embedding.length !== 1024) {
      throw new Error(`Embedding dimension mismatch: expected 1024, got ${embedding.length}`);
    }

    return embedding;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Embedding request timed out after 30 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
