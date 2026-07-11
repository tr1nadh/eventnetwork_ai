import { json } from '@sveltejs/kit';
import { FIREWORKS_API_KEY } from '$env/static/private';

// ------------------------------------------------------------
// POST – generate an embedding for a given text
// ------------------------------------------------------------
export async function POST({ request }) {
  const { text } = await request.json();

  if (!text || typeof text !== 'string') {
    return json({ error: 'Missing or invalid "text" field' }, { status: 400 });
  }

  if (!FIREWORKS_API_KEY) {
    return json({ error: 'Missing FIREWORKS_API_KEY.' }, { status: 500 });
  }

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
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Fireworks embedding error', res.status, err);
      return json({ error: `Embedding generation failed: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding ?? [];

    if (!Array.isArray(embedding) || embedding.length !== 1024) {
      console.error('Embedding dimension mismatch: expected 1024, got', embedding.length);
      return json(
        { error: `Embedding dimension mismatch: expected 1024, got ${embedding.length}` },
        { status: 502 }
      );
    }

    return json({ embedding });
  } catch (err) {
    console.error('Embedding request failed', err);
    return json(
      { error: err instanceof Error ? err.message : 'Embedding request failed' },
      { status: 500 }
    );
  }
}
