import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoAttendees, demoEvent } from '$lib/demo';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  if (params.slug === demoEvent.slug) {
    return {
      event: {
        ...demoEvent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      suggestedMatches: [],
      user: locals.user
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select('id, name, description, slug, created_by, created_at, updated_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (loadError) {
    throw error(500, loadError.message);
  }

  if (!data) {
    throw error(404, 'Event not found.');
  }

  let isParticipant = false;
  if (locals.user && data) {
    // Retrieve participant row
    const { data: participantData, error: participantError } = await admin
      .from('event_participants')
      .select('status')
      .eq('event_id', data.id)
      .eq('user_id', locals.user.id)
      .maybeSingle();

    if (participantData && participantData.status === 'joined') {
      isParticipant = true;
    }
  }

  // After checking participant status, load the user's network profile if they have joined
let networkProfile = null;
let suggestedMatches = [];
if (isParticipant) {
  const { data: profileData, error: profileError } = await admin
    .from('network_profiles')
    .select('display_name, what_i_do, looking_for, about_me')
    .eq('event_id', data.id)
    .eq('user_id', locals.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to load network profile:', profileError);
  } else if (profileData) {
    let lookingForStr = profileData.looking_for ?? '';
    try {
      const parsed = JSON.parse(lookingForStr);
      if (Array.isArray(parsed)) {
        lookingForStr = parsed.join(', ');
      }
    } catch (e) {}

    networkProfile = {
      whoTheyAre: profileData.display_name,
      whatTheyDo: profileData.what_i_do,
      whoTheyWant: lookingForStr,
      expectations: profileData.about_me
    };
  }

  // Fetch cached matches from the matches table
  const { data: dbMatches, error: matchError } = await admin
    .from('matches')
    .select('matched_user_id, match_details')
    .eq('event_id', data.id)
    .eq('user_id', locals.user.id)
    .order('updated_at', { ascending: false });

  if (!matchError && dbMatches) {
    suggestedMatches = dbMatches.map(m => ({
      user_id: m.matched_user_id,
      name: m.match_details.matched_profile?.display_name,
      role: m.match_details.matched_profile?.what_i_do,
      about: m.match_details.matched_profile?.about_me,
      explanation: m.match_details.summary,
      matchPercentage: m.match_details.score,
      tags: []
    })).sort((a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0));
  }
}

return {
  event: data,
  suggestedMatches,
  user: locals.user,
  isParticipant,
  networkProfile
};};
