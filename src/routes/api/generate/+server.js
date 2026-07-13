import { FIREWORKS_API_KEY, FIREWORKS_MODEL } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { generateText } from 'ai';
import { fireworks } from '@ai-sdk/fireworks';

export async function POST({ request, locals }) {
  if (!FIREWORKS_API_KEY) {
    return json({ error: 'Missing FIREWORKS_API_KEY.' }, { status: 500 });
  }

  if (!locals.user) {
    return json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let prompt = body?.prompt;
  if (typeof prompt === 'string') {
    prompt = prompt.trim();
  } else {
    prompt = null;
  }

  if (!prompt) {
    return json({ error: 'Prompt is required.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const { text } = await generateText({
      model: fireworks(FIREWORKS_MODEL),
      prompt,
      abortSignal: controller.signal
    });
    return json({ text });
  } catch (err) {
    console.error('LLM generation failed:', err);
    if (err.name === 'AbortError') {
      return json({ error: 'LLM request timed out after 30 seconds' }, { status: 504 });
    }
    return json(
      { error: err instanceof Error ? err.message : 'Text generation failed' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
