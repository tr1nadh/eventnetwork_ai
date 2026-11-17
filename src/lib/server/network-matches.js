import { selectNetworkProfiles } from './network-profile-query.js';
import { error } from '@sveltejs/kit';
import { hasNetworkingProfile } from '../network-profile.js';

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

export async function rankNetworkMatches(supabase, eventId, user) {
  // Fetch current user's networking profile for the event
  const { data: currentProfile, error: curErr } = await supabase
    .from('network_profiles')
    .select('display_name, what_i_do, looking_for, about_me, about_user_embed, looking_for_embed')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (curErr) throw error(500, 'Could not load your networking profile');
  if (!hasNetworkingProfile(currentProfile)) {
    return { currentProfile, scored: [] };
  }

  const userEmbedding = currentProfile.looking_for_embed;
  if (!userEmbedding) {
    return { currentProfile, scored: [] };
  }

  // Fetch other participants in the same event
  const [profiles, registrations, event] = await Promise.all([
    selectNetworkProfiles('user_id, display_name, what_i_do, looking_for, about_me, about_user_embed, looking_for_embed',
      columns => supabase.from('network_profiles').select(columns)
        .eq('event_id', eventId).neq('user_id', user.id).not('about_user_embed', 'is', null)),
    supabase.from('event_participants').select('user_id').eq('event_id', eventId).eq('status', 'joined'),
    supabase.from('events').select('created_by').eq('id', eventId).maybeSingle()
  ]);
  if (profiles.error || registrations.error || event.error) throw error(500, 'Could not load event attendees');
  const joined = new Set((registrations.data ?? []).map(row => row.user_id));
  const participants = (profiles.data ?? []).filter(p =>
    joined.has(p.user_id) && p.user_id !== event.data?.created_by && hasNetworkingProfile(p)
  );

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

  return { currentProfile, scored };
}

export async function loadSavedNetworkMatches(db, eventId, user) {
  const { data, error: readError } = await db.from('matches').select('matched_user_id, match_details')
    .eq('event_id', eventId).eq('user_id', user.id);
  if (readError) throw error(500, readError.message);
  if (!data?.length) return [];
  const saved = new Map(data.map(row => [row.matched_user_id, row.match_details]));
  const { scored } = await rankNetworkMatches(db, eventId, user);
  return scored.filter(match => saved.has(match.user_id)).map(match => ({
    ...match, explanation: saved.get(match.user_id)?.summary, tags: []
  }));
}
