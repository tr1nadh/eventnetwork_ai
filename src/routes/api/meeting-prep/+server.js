import { json, error } from '@sveltejs/kit';
import { createChatCompletion } from '$lib/llm/fireworks';
import { FIREWORKS_MODEL } from '$env/static/private';
import { checkAiQuota, refundAiCredit } from '$lib/server/ai-credits';

/**
 * GET /api/meeting-prep?connection_id=...&regenerate=true
 */
export async function GET({ url, locals }) {
  const connectionId = url.searchParams.get('connection_id');
  if (!connectionId) throw error(400, 'Missing connection_id');

  const supabase = locals.supabase;
  const user = locals.user;
  if (!user) throw error(401, 'Unauthenticated');

  // Fetch connection
  const { data: connection, error: connErr } = await supabase
    .from('connections')
    .select('id, event_id, sender_user_id, receiver_user_id, status, match_id')
    .eq('id', connectionId)
    .single();

  if (connErr || !connection) {
    throw error(404, 'Connection not found');
  }

  // Ensure user is part of connection and it is accepted
  if (connection.sender_user_id !== user.id && connection.receiver_user_id !== user.id) {
    throw error(403, 'Unauthorized');
  }

  if (connection.status !== 'accepted') {
    throw error(400, 'AI Meeting Prep is only available for accepted connections');
  }

  const otherUserId = connection.sender_user_id === user.id ? connection.receiver_user_id : connection.sender_user_id;

  // Fetch profiles for both users
  const { data: profiles, error: profErr } = await supabase
    .from('network_profiles')
    .select('user_id, what_i_do, about_me, looking_for, display_name')
    .eq('event_id', connection.event_id)
    .in('user_id', [user.id, otherUserId]);

  if (profErr) {
    throw error(500, 'Could not load networking profiles');
  }
  if (!profiles || profiles.length !== 2) {
    throw error(404, 'One or both users have not set up a networking profile for this event');
  }

  const myProfile = profiles.find(p => p.user_id === user.id);
  const theirProfile = profiles.find(p => p.user_id === otherUserId);

  if (!myProfile || !theirProfile) throw error(404, 'Both networking profiles are required');

  // Fetch match details
  let matchContext = 'No AI Match data available.';
  if (connection.match_id) {
    const { data: matchData } = await supabase
      .from('matches')
      .select('match_details')
      .eq('id', connection.match_id)
      .single();
    
    if (matchData?.match_details) {
      matchContext = `
Match Score: ${matchData.match_details.score || 'N/A'}%
AI Match Reason: ${matchData.match_details.summary || 'N/A'}
      `.trim();
    }
  }

  const systemPrompt = 'Prepare a natural, specific face-to-face networking conversation. Return only JSON with conversation_starters and questions_to_ask (three short strings each), and collaboration_opportunity (one short paragraph). Ground suggestions in both profiles and avoid repeating the match summary.';
  const userPrompt = JSON.stringify({
    viewer: { name: myProfile.display_name, role: myProfile.what_i_do, about: myProfile.about_me, seeks: myProfile.looking_for },
    attendee: { name: theirProfile.display_name, role: theirProfile.what_i_do, about: theirProfile.about_me, seeks: theirProfile.looking_for },
    match: matchContext
  });

  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) {
    return json(quota.errorData, { status: 429 });
  }

  try {
    const llmRes = await createChatCompletion({
      model: FIREWORKS_MODEL || 'accounts/fireworks/models/qwen2p5-7b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500
    });

    let content = llmRes.choices?.[0]?.message?.content?.trim();
    
    // Strip markdown json blocks if the model accidentally added them
    if (content.startsWith('\`\`\`json')) {
      content = content.substring(7);
    } else if (content.startsWith('\`\`\`')) {
      content = content.substring(3);
    }
    if (content.endsWith('\`\`\`')) {
      content = content.substring(0, content.length - 3);
    }
    content = content.trim();

    const parsed = JSON.parse(content);
    const validList = (items) => Array.isArray(items) && items.length === 3
      && items.every(item => typeof item === 'string' && item.trim());
    if (!validList(parsed?.conversation_starters) || !validList(parsed?.questions_to_ask)
      || typeof parsed?.collaboration_opportunity !== 'string' || !parsed.collaboration_opportunity.trim()) {
      throw new Error('Incomplete meeting prep');
    }
    return json(parsed, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('AI Meeting Prep generation failed:', err);
    await refundAiCredit(user.id);
    throw error(500, 'Failed to generate AI Meeting Prep');
  }
}
