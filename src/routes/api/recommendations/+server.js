import { rankNetworkMatches } from '../../../lib/server/network-matches.js';
import { json, error } from '@sveltejs/kit';
import { createChatCompletion } from '$lib/llm/fireworks';
import { FIREWORKS_MODEL } from '$env/static/private';
import { checkAiQuota, refundAiCredit } from '$lib/server/ai-credits';

function shorten(value, limit) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function fallbackExplanation(currentProfile, match) {
  const whatTheyDo = shorten(match.role, 130) || 'relevant experience';
  const lookingFor = shorten(currentProfile.looking_for, 140) || 'the connections you are seeking';
  return `Their experience in ${whatTheyDo} aligns with what you are looking for. Your interest in ${lookingFor} gives you a concrete reason to connect.`;
}

export async function GET({ url, locals }) {
  const eventId = url.searchParams.get('event_id');
  if (!eventId) {
    throw error(400, 'Missing event_id');
  }

  const supabase = locals.supabase;
  const user = locals.user;
  if (!user) {
    throw error(401, 'Unauthenticated');
  }

  const { currentProfile, scored } = await rankNetworkMatches(supabase, eventId, user);
  if (scored.length === 0) {
    return json({ recommendations: [] });
  }

  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) {
    return json(quota.errorData, { status: 429 });
  }

  // Use request-local numeric keys so repeated names or missing entries cannot
  // shift one attendee's explanation onto another card.
  let explanations = {};
  try {
    const completion = await createChatCompletion({
      model: FIREWORKS_MODEL || 'accounts/fireworks/models/qwen2p5-7b-instruct',
      messages: [
        {
          role: 'system',
          content: 'For each attendee, explain the strongest fit with what the viewer seeks in 1-2 specific sentences. Address the viewer as "you"; omit names. Return JSON {"explanations":{"0":"..."}} keyed by attendee ID.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            viewer: { role: currentProfile.what_i_do, about: currentProfile.about_me, seeks: currentProfile.looking_for },
            attendees: scored.map(({ role, about, looking_for }, id) => ({ id, role, about, seeks: looking_for }))
          })
        }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
      max_tokens: 32 + scored.length * 100
    });
    explanations = JSON.parse(completion.choices?.[0]?.message?.content)?.explanations ?? {};
  } catch {
    console.warn('Using fallback match explanations after a provider failure.');
  }

  let usedAi = false;
  for (const [id, match] of scored.entries()) {
    const reason = explanations[id];
    if (typeof reason === 'string' && /[.!?]$/.test(reason.trim())) {
      match.explanation = reason.trim();
      usedAi = true;
    } else {
      match.explanation = fallbackExplanation(currentProfile, match);
    }
  }
  if (!usedAi) await refundAiCredit(user.id);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for (const match of scored) {
          // Upsert this match into the database
          const matchRow = {
            event_id: eventId,
            user_id: user.id,
            matched_user_id: match.user_id,
            match_details: {
              score: match.matchPercentage,
              summary: match.explanation,
              requester_profile: {
                display_name: currentProfile.display_name,
                what_i_do: currentProfile.what_i_do,
                about_me: currentProfile.about_me
              },
              matched_profile: {
                display_name: match.name,
                what_i_do: match.role,
                about_me: match.about
              }
            },
            updated_at: new Date().toISOString()
          };

          const { error: upsertErr } = await supabase.from('matches').upsert(matchRow, {
            onConflict: 'event_id,user_id,matched_user_id'
          });
          if (upsertErr) {
            console.error('Failed to upsert match into database:', upsertErr);
          }

          // Enqueue the match to the stream
          controller.enqueue(encoder.encode(JSON.stringify(match) + '\n'));
        }
        controller.close();
      } catch (streamErr) {
        console.error('Stream generation error:', streamErr);
        if (usedAi) await refundAiCredit(user.id);
        controller.error(streamErr);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
      'X-AI-Credit-Used': usedAi ? '1' : '0',
      'Connection': 'keep-alive'
    }
  });
}
