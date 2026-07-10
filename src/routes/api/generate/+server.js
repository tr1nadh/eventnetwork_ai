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
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return json({ error: 'Prompt is required.' }, { status: 400 });
  }

  const { text } = await generateText({
    model: fireworks(FIREWORKS_MODEL || 'accounts/fireworks/models/llama-v3p1-8b-instruct'),
    prompt
  });

  return json({ text });
}
