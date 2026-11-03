import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createChatCompletion } from '$lib/llm/fireworks';
import { FIREWORKS_MODEL } from '$env/static/private';
import { checkAiQuota, refundAiCredit } from '$lib/server/ai-credits';

function parseQuestions(content) {
  let cleaned = content?.trim() ?? '';
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

  const parsed = JSON.parse(cleaned.trim());
  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions.filter((question) => typeof question === 'string' && question.trim()).map((question) => question.trim())
    : [];

  if (questions.length < 3) {
    throw new Error('AI did not return enough icebreaker questions');
  }

  return questions.slice(0, 4);
}

export async function POST({ request, cookies }) {
  const { connection_id: connectionId } = await request.json().catch(() => ({}));
  if (!connectionId) return json({ error: 'Missing connection ID' }, { status: 400 });

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: connection, error: connectionError } = await supabase
    .from('connections')
    .select('id, event_id, sender_user_id, receiver_user_id, status, match_id')
    .eq('id', connectionId)
    .maybeSingle();

  if (connectionError || !connection) return json({ error: 'Connection not found' }, { status: 404 });
  if (connection.sender_user_id !== user.id && connection.receiver_user_id !== user.id) {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (connection.status !== 'accepted') {
    return json({ error: 'Icebreakers are available for accepted connections only' }, { status: 400 });
  }

  const otherUserId = connection.sender_user_id === user.id
    ? connection.receiver_user_id
    : connection.sender_user_id;
  const { data: profiles, error: profilesError } = await supabase
    .from('network_profiles')
    .select('user_id, display_name, what_i_do, about_me, looking_for')
    .eq('event_id', connection.event_id)
    .in('user_id', [user.id, otherUserId]);

  if (profilesError || !profiles || profiles.length !== 2) {
    return json({ error: 'Both networking profiles are needed to create icebreakers' }, { status: 404 });
  }

  const myProfile = profiles.find((profile) => profile.user_id === user.id);
  const theirProfile = profiles.find((profile) => profile.user_id === otherUserId);
  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) return json(quota.errorData, { status: 429 });

  try {
    const completion = await createChatCompletion({
      model: FIREWORKS_MODEL || 'accounts/fireworks/models/qwen2p5-7b-instruct',
      temperature: 0.7,
      max_tokens: 350,
      messages: [
        {
          role: 'system',
          content: `You write concise, natural first chat messages for professional networking. Generate exactly four friendly, specific questions based on the recipient's profile and the sender's context. Avoid generic questions, salesy language, and mentioning AI. Return only valid JSON: {"questions":["Question 1?","Question 2?","Question 3?","Question 4?"]}.`
        },
        {
          role: 'user',
          content: `Sender profile:\nName: ${myProfile.display_name}\nWhat i do: ${myProfile.what_i_do}\nAbout: ${myProfile.about_me}\nLooking for: ${myProfile.looking_for}\n\nRecipient profile:\nName: ${theirProfile.display_name}\nWhat i do: ${theirProfile.what_i_do}\nAbout: ${theirProfile.about_me}\nLooking for: ${theirProfile.looking_for}`
        }
      ]
    });

    const questions = parseQuestions(completion.choices?.[0]?.message?.content);
    return json({ questions });
  } catch (err) {
    await refundAiCredit(user.id);
    console.error('Icebreaker generation failed:', err);
    return json({ error: 'Could not generate icebreakers. Please try again.' }, { status: 500 });
  }
}
