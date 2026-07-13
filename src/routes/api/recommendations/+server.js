import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createChatCompletion } from '$lib/llm/fireworks';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

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

export async function GET({ url, cookies }) {
  const eventId = url.searchParams.get('event_id');
  if (!eventId) {
    throw error(400, 'Missing event_id');
  }

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw error(401, 'Unauthenticated');
  }

  // Fetch current user's networking profile for the event
  const { data: currentProfile, error: curErr } = await supabase
    .from('network_profiles')
    .select('display_name, what_i_do, looking_for, about_me, looking_for_embed')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (curErr || !currentProfile) {
    return json({ recommendations: [] });
  }

  const userEmbedding = currentProfile.looking_for_embed;
  if (!userEmbedding) {
    return json({ recommendations: [] });
  }

  // Fetch other participants in the same event
  const { data: participants, error: partErr } = await supabase
    .from('network_profiles')
    .select('user_id, display_name, what_i_do, about_me, about_user_embed')
    .eq('event_id', eventId)
    .neq('user_id', user.id)
    .not('about_user_embed', 'is', null);

  if (partErr || !participants) {
    return json({ recommendations: [] });
  }

  // Compute similarity scores and take top 5 matches
  const scored = participants
    .map(p => {
      const similarity = cosineSimilarity(userEmbedding, p.about_user_embed);
      return { ...p, similarity };
    })
    .filter(p => p.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5) // Limit to top 5 to prevent slow LLM generation times
    .map(p => ({
      user_id: p.user_id,
      name: p.display_name,
      role: p.what_i_do,
      about: p.about_me,
      matchPercentage: Math.round(p.similarity * 100),
      is_dummy: false // will be updated below
    }));

  // Detect dummy users by checking email pattern via admin client
  try {
    const admin = createSupabaseAdminClient();
    await Promise.all(
      scored.map(async (match) => {
        const { data: authUser } = await admin.auth.admin.getUserById(match.user_id);
        if (/^dummy\d+\+.+@eventnetwork\.ai$/.test(authUser?.user?.email ?? '')) {
          match.is_dummy = true;
        }
      })
    );
  } catch (e) {
    console.error('Failed to check dummy status for matches:', e);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const myProfileContext = `
My name is ${currentProfile.display_name}.
What I do: ${currentProfile.what_i_do}
About me: ${currentProfile.about_me}
I am looking for: ${currentProfile.looking_for}
`;

      const promises = scored.map(async (match) => {
        const matchContext = `
Their name is ${match.name}.
What they do: ${match.role}
About them: ${match.about}
`;

        const systemPrompt = `You are an AI matchmaker for a professional networking event.
Given my profile and a matched attendee's profile, write a concise 1-2 sentence explanation of WHY we are a good match.
Focus on the single strongest connection point: a shared interest, complementary skill, or collaboration opportunity.
Speak directly to me. Be brief and punchy. No greetings or pleasantries.`;

        try {
          const llmRes = await createChatCompletion({
            model: 'accounts/fireworks/models/qwen3p7-plus',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `My Profile:\n${myProfileContext}\n\nMatched Profile:\n${matchContext}` }
            ],
            temperature: 0.7,
            max_tokens: 80,
            reasoning_effort: 'none'
          });
          match.explanation = llmRes.choices?.[0]?.message?.content?.trim();
        } catch (err) {
          console.error('Failed to generate explanation for', match.name, err);
        }

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
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(JSON.stringify(match) + '\n'));
      });

      try {
        await Promise.all(promises);
        controller.close();
      } catch (streamErr) {
        console.error('Stream generation error:', streamErr);
        controller.error(streamErr);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
