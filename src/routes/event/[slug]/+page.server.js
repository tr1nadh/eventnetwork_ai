import { signEventImages } from '$lib/server/event-images';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoEvent } from '$lib/demo';
import { error } from '@sveltejs/kit';

async function loadViewerData(admin, eventId, userId, isOrganizer) {
  if (!userId) return {};
  const { data: participant, error: lookupError } = await admin.from('event_participants')
    .select('status').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (lookupError) throw error(500, lookupError.message);
  const status = participant?.status;
  if (status !== 'joined' && !isOrganizer) return { status };
  const [meeting, profileRes, matchRes] = await Promise.all([
    admin.from('events').select('event_meeting_url').eq('id', eventId).maybeSingle(),
    admin.from('network_profiles').select('display_name, what_i_do, looking_for, about_me')
      .eq('event_id', eventId).eq('user_id', userId).maybeSingle(),
    admin.from('matches').select('matched_user_id, match_details')
      .eq('event_id', eventId).eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);
  return { status, meetingUrl: meeting.data?.event_meeting_url, profileRes, matchRes };
}

export const load = async ({ params, locals }) => {
  if (params.slug === demoEvent.slug) {
    return {
      event: {
        ...demoEvent,
        created_by: demoEvent.created_by ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      suggestedMatches: [],
      timeline: [],
      user: locals.user,
      isOrganizer: false,
      isParticipant: false,
      networkProfile: null,
      analytics: null
    };
  }

  const PUBLIC_EVENT_FIELDS =
    'id, name, description, slug, venue_map, created_by, created_at, updated_at, start_time, end_time, location, google_map_url, event_format, attendees_count, max_attendees, is_attendees_register_limited, event_logo_url, event_banner_url, is_public, allow_join_after_start, is_approval_required, is_venue_enabled, is_network_enabled, is_announcements_enabled';

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select(PUBLIC_EVENT_FIELDS)
    .eq('slug', params.slug)
    .maybeSingle();

  if (loadError) {
    throw error(500, loadError.message);
  }

  if (!data) {
    throw error(404, 'Event not found.');
  }

  // Determine auth state early so we can enforce is_public
  const isOrganizer = !!locals.user && data.created_by === locals.user.id;

  // Non-public events are only accessible to the organizer (and later participants).
  // Non-authenticated visitors or non-organizer users cannot view private events.
  if (!data.is_public && !isOrganizer) {
    throw error(404, 'Event not found.');
  }

  const [viewer, timelineRes, announcementsRes, imageUrls] = await Promise.all([
    loadViewerData(admin, data.id, locals.user?.id, isOrganizer),
    admin.from('event_timeline').select('*').eq('event_id', data.id)
      .order('start_time', { ascending: true }).order('sort_order', { ascending: true }),
    admin.from('event_announcements').select('*').eq('event_id', data.id)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    signEventImages(admin, [data]),
  ]);
  const participantStatus = viewer.status;
  const isParticipant = participantStatus === 'joined';
  if (viewer.meetingUrl) data.event_meeting_url = viewer.meetingUrl;

  let networkProfile = null;
  let suggestedMatches = [];
  
  if (isParticipant || isOrganizer) {
    // Hosts can switch to attendee view, so load their event profile too.
    // Fetch profile and matches in parallel to speed up load time.
    const { profileRes, matchRes } = viewer;
    const { data: profileData, error: profileError } = profileRes;
    const { data: dbMatches, error: matchError } = matchRes;

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

      const metadata = locals.user.user_metadata ?? {};
      const accountName = metadata.full_name ?? metadata.name ?? metadata.display_name ?? locals.user.email?.split('@')[0] ?? profileData.display_name;
      networkProfile = {
        whoTheyAre: accountName,
        whatTheyDo: profileData.what_i_do,
        whoTheyWant: lookingForStr,
        expectations: profileData.about_me
      };
    }

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
    timeline: timelineRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    user: locals.user,
    isOrganizer,
    isParticipant,
    registrationPending: participantStatus === 'waitlisted' || participantStatus === 'requested',
    networkProfile,
    imageUrls
  };
};
