import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

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

  const { data: dbMatches, error: matchError } = await supabase
    .from('matches')
    .select('matched_user_id, match_details')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (matchError) {
    throw error(500, matchError.message);
  }

  const matches = (dbMatches || []).map(m => ({
    user_id: m.matched_user_id,
    name: m.match_details.matched_profile?.display_name,
    role: m.match_details.matched_profile?.what_i_do,
    about: m.match_details.matched_profile?.about_me,
    explanation: m.match_details.summary,
    matchPercentage: m.match_details.score,
    tags: []
  }));

  return json({ matches });
}
