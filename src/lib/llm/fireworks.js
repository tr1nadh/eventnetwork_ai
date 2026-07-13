import { FIREWORKS_API_KEY } from '$env/static/private';

/**
 * Call Fireworks chat completions API directly.
 * Server-side only – never import in client code.
 *
 * @param {object} options
 * @param {string} options.model - e.g. 'accounts/fireworks/models/qwen3p7-plus'
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.max_tokens=2048]
 * @returns {Promise<object>} The full chat completion response
 */
export async function createChatCompletion({ model, messages, temperature = 0.7, max_tokens = 2048, response_format, reasoning_effort }) {
  if (!FIREWORKS_API_KEY) {
    throw new Error('Missing FIREWORKS_API_KEY');
  }

  const body = { model, messages, temperature, max_tokens };
  if (response_format) body.response_format = response_format;
  if (reasoning_effort) body.reasoning_effort = reasoning_effort;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

  try {
    const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Chat completion failed (${res.status}): ${err}`);
    }

    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM request timed out after 30 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
