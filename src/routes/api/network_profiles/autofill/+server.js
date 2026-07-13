import { FIREWORKS_API_KEY, FIREWORKS_MODEL } from '$env/static/private';
import { json } from '@sveltejs/kit';

function cleanString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeProfileDraft(raw) {
	return {
		displayName: cleanString(raw?.displayName),
		whatTheyDo: cleanString(raw?.whatTheyDo),
		aboutMe: cleanString(raw?.aboutMe),
		whoTheyWant: cleanString(raw?.whoTheyWant)
	};
}

function extractJsonObject(content) {
	if (!content || typeof content !== 'string') {
		throw new Error('Model returned an empty response.');
	}

	// Remove common reasoning tags if present
	const cleaned = content
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/```json/g, '')
		.replace(/```/g, '')
		.trim();

	const match = cleaned.match(/\{[\s\S]*\}/);

	if (!match) {
		throw new Error(`Model did not return valid JSON.\n\nResponse:\n${cleaned}`);
	}

	try {
		return JSON.parse(match[0]);
	} catch (err) {
		throw new Error(`Failed to parse model JSON.\n\n${err.message}`);
	}
}

export async function POST({ request, locals }) {
	if (!FIREWORKS_API_KEY) {
		return json({ error: 'Missing FIREWORKS_API_KEY.' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ error: 'Unauthorized.' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const sourceText = cleanString(body?.text);

	if (!sourceText) {
		return json({ error: 'Profile text is required.' }, { status: 400 });
	}

	const systemPrompt = `
You are an information extraction AI for a networking application.

Your job is to extract structured profile information.

Return ONLY a valid JSON object.

Do NOT:
- Explain anything.
- Think out loud.
- Return markdown.
- Return code fences.
- Return <think> blocks.

Use this exact schema:

{
  "displayName": "",
  "whatTheyDo": "",
  "aboutMe": "",
  "whoTheyWant": ""
}

Rules:
- Keep text concise.
- Preserve the user's intent.
- Never invent facts.
- Infer only when strongly supported.
- Unknown fields must be empty strings.
`.trim();

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30_000);

		let res;
		try {
			res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${FIREWORKS_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: FIREWORKS_MODEL,
					messages: [
						{
							role: 'system',
							content: systemPrompt
						},
						{
							role: 'user',
							content: sourceText
						}
					],

					temperature: 0,
					max_tokens: 300,

					// Prevent reasoning output (supported on Qwen 3.7+)
					reasoning_effort: 'none'
				}),
				signal: controller.signal
			});
		} catch (fetchErr) {
			if (fetchErr.name === 'AbortError') {
				throw new Error('AI request timed out after 30 seconds. Please try again.');
			}
			throw fetchErr;
		} finally {
			clearTimeout(timeout);
		}

		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`Fireworks API Error (${res.status}): ${errorText}`);
		}

		const completion = await res.json();

		const content =
			completion?.choices?.[0]?.message?.content ??
			completion?.choices?.[0]?.text ??
			'';

		const parsed = extractJsonObject(content);
		const profile = normalizeProfileDraft(parsed);

		return json({ profile });
	} catch (error) {
		console.error(error);

		return json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to generate profile draft.'
			},
			{ status: 502 }
		);
	}
}