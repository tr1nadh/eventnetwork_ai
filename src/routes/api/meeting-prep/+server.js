import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createChatCompletion } from '$lib/llm/fireworks';

/**
 * GET /api/meeting-prep?connection_id=...&regenerate=true
 */
export async function GET({ url, cookies }) {
  const connectionId = url.searchParams.get('connection_id');
  if (!connectionId) throw error(400, 'Missing connection_id');

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated');

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

  if (profErr || !profiles || profiles.length !== 2) {
    throw error(500, 'Could not load networking profiles for both users');
  }

  const myProfile = profiles.find(p => p.user_id === user.id);
  const theirProfile = profiles.find(p => p.user_id === otherUserId);

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

  const systemPrompt = `You are an expert AI networking coach helping professionals prepare for meaningful in-person meetings.
You will be given the profiles of two individuals who have agreed to meet, as well as the initial AI Match Context.
Your goal is to generate personalized conversation starters, relevant questions, and collaboration opportunities using the context of both users.
The generated content should:
- Feel natural, personalized, and professional
- Be suitable for face-to-face networking
- Avoid generic advice
- Avoid repeating the existing AI Match Summary verbatim
- Encourage meaningful conversations

You MUST return ONLY valid JSON matching this schema:
{
  "conversation_starters": [
    "String 1",
    "String 2",
    "String 3"
  ],
  "questions_to_ask": [
    "String 1",
    "String 2",
    "String 3"
  ],
  "collaboration_opportunity": "A short paragraph describing how they could potentially collaborate."
}
No markdown formatting, no explanations, no reasoning outside the JSON.`;

  const userPrompt = `
## Current User (Me)
- Name: ${myProfile.display_name}
- What I Do: ${myProfile.what_i_do}
- About Me: ${myProfile.about_me}
- Looking For: ${myProfile.looking_for}

## Connected User (Them)
- Name: ${theirProfile.display_name}
- What I Do: ${theirProfile.what_i_do}
- About Me: ${theirProfile.about_me}
- Looking For: ${theirProfile.looking_for}

## Existing Match Context
${matchContext}

Generate the Meeting Prep JSON now.`;

  try {
    const llmRes = await createChatCompletion({
      model: 'accounts/fireworks/models/qwen3p7-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      reasoning_effort: 'none'
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
    return json(parsed);
  } catch (err) {
    console.error('AI Meeting Prep generation failed:', err);
    throw error(500, 'Failed to generate AI Meeting Prep');
  }
}
