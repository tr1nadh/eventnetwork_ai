import { json } from '@sveltejs/kit';
import { getAiCreditStatus } from '$lib/server/ai-credits';

/**
 * GET /api/ai/credits
 * Returns the current authenticated user's AI credit status.
 */
export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const status = await getAiCreditStatus(locals.user.id);
    return json(status);
  } catch (error) {
    console.error('Failed to get AI credits status:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
