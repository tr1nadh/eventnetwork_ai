import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createChatCompletion } from '$lib/llm/fireworks';

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
      name: p.display_name,
      role: p.what_i_do,
      about: p.about_me,
      matchPercentage: Math.round(p.similarity * 100)
    }));

  // Generate AI explanations in parallel
  const myProfileContext = `
My name is ${currentProfile.display_name}.
What I do: ${currentProfile.what_i_do}
About me: ${currentProfile.about_me}
I am looking for: ${currentProfile.looking_for}
`;

  const recommendations = await Promise.all(scored.map(async (match) => {
    const matchContext = `
Their name is ${match.name}.
What they do: ${match.role}
About them: ${match.about}
`;

    const systemPrompt = `You are an AI matchmaker for a professional networking event.
Given my profile and a matched attendee's profile, write a short, compelling explanation (2-3 sentences) of WHY we are a good match.
Focus on shared interests, complementary skills, or potential collaboration.
Speak directly to me (e.g. "You both have experience in...", "They could help you with...").
Do NOT use greetings or pleasantries, just get straight to the analysis.`;

    try {
      const llmRes = await createChatCompletion({
        model: 'accounts/fireworks/models/qwen3p7-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `My Profile:\n${myProfileContext}\n\nMatched Profile:\n${matchContext}` }
        ],
        temperature: 0.7,
        max_tokens: 150,
        reasoning_effort: 'none'
      });
      const explanation = llmRes.choices?.[0]?.message?.content?.trim();
      return { ...match, explanation };
    } catch (err) {
      console.error('Failed to generate explanation for', match.name, err);
      return match;
    }
  }));

  return json({ recommendations });
}
