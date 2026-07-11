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
    networkProfile = {
      whoTheyAre: profileData.display_name,
      whatTheyDo: profileData.what_i_do,
      whoTheyWant: Array.isArray(profileData.looking_for) ? profileData.looking_for.join(', ') : profileData.looking_for,
      expectations: profileData.about_me
    };
  }
}

return {
  event: data,
  suggestedMatches: [],
  user: locals.user,
  isParticipant,
  networkProfile
};};
