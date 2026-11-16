import { json, error } from '@sveltejs/kit';
import { createChatCompletion } from '$lib/llm/fireworks';
import { FIREWORKS_MODEL } from '$env/static/private';
import { checkAiQuota, refundAiCredit } from '$lib/server/ai-credits';

function cosineSimilarity(a, b) {
  if (typeof a === 'string') a = JSON.parse(a);
  if (typeof b === 'string') b = JSON.parse(b);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

  // Fetch current user's networking profile for the event
  const { data: currentProfile, error: curErr } = await supabase
    .from('network_profiles')
    .select('display_name, what_i_do, looking_for, about_me, about_user_embed, looking_for_embed')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (curErr) throw error(500, 'Could not load your networking profile');
  if (!currentProfile) {
    return json({ recommendations: [] });
  }

  const userEmbedding = currentProfile.looking_for_embed;
  if (!userEmbedding) {
    return json({ recommendations: [] });
  }

  // Fetch other participants in the same event
  const { data: participants, error: partErr } = await supabase
    .from('network_profiles')
    .select('user_id, display_name, what_i_do, looking_for, about_me, about_user_embed, looking_for_embed, is_dummy')
    .eq('event_id', eventId)
    .neq('user_id', user.id)
    .not('about_user_embed', 'is', null);

  if (partErr) throw error(500, 'Could not load event attendees');
  if (!participants) {
    return json({ recommendations: [] });
  }

  // A recommendation is primarily one-way: what the viewer is looking for
  // matched against what an attendee offers. Reciprocal intent is a bonus for
  // mutually useful matches, never a penalty that can hide a strong fit.
  const scored = participants
    .map(p => {
      const intentFit = cosineSimilarity(userEmbedding, p.about_user_embed);
      const reciprocalFit = currentProfile.about_user_embed && p.looking_for_embed
        ? cosineSimilarity(currentProfile.about_user_embed, p.looking_for_embed)
        : 0;
      const reciprocalBonus = Math.max(0, reciprocalFit) * 0.2;
      const similarity = Math.min(1, intentFit + reciprocalBonus);
      return { ...p, similarity };
    })
    .filter(p => p.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5) // Limit to top 5 to prevent slow LLM generation times
    .map(p => ({
      user_id: p.user_id,
      name: p.display_name,
      role: p.what_i_do,
      looking_for: p.looking_for,
      about: p.about_me,
      matchPercentage: Math.round(p.similarity * 100),
      is_dummy: Boolean(p.is_dummy)
    }));

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
