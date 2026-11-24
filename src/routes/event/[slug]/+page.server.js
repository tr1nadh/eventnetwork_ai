import { loadSavedNetworkMatches } from '$lib/server/network-matches';
import { getEventParticipantStatus, requireEventReadAccess } from '$lib/server/event-access';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoEvent } from '$lib/demo';
import { error } from '@sveltejs/kit';

async function loadViewerData(admin, eventId, userId, isOrganizer, knownStatus) {
  if (!userId) return {};
  const status = knownStatus ?? await getEventParticipantStatus(admin, eventId, userId);
  if (status !== 'joined' && !isOrganizer) return { status };
  const [meeting, profileRes, matches] = await Promise.all([
    admin.from('events').select('event_meeting_url').eq('id', eventId).maybeSingle(),
    admin.from('network_profiles').select('display_name, what_i_do, looking_for, about_me')
      .eq('event_id', eventId).eq('user_id', userId).maybeSingle(),
    loadSavedNetworkMatches(admin, eventId, { id: userId }).catch(err => {
      console.error('Failed to load networking matches:', err);
      return [];
    }),
  ]);
  return { status, meetingUrl: meeting.data?.event_meeting_url, profileRes, matches };
}

export const load = async ({ params, locals }) => {
  const PUBLIC_EVENT_FIELDS =
    'id, name, description, slug, venue_map, created_by, created_at, updated_at, start_time, end_time, location, google_map_url, event_format, attendees_count, max_attendees, is_attendees_register_limited, event_logo_url, event_banner_url, is_public, allow_join_after_start, is_approval_required, is_venue_enabled, is_network_enabled, is_announcements_enabled';

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select(PUBLIC_EVENT_FIELDS)
    .eq('slug', params.slug)
    .maybeSingle();

  if (loadError) throw error(500, loadError.message);

  if (!data && params.slug === demoEvent.slug) {
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

  const userId = locals.user?.id;
  const knownStatus = await requireEventReadAccess(admin, data, userId);
  const isOrganizer = Boolean(userId && data.created_by === userId);

  const [viewer, timelineRes, announcementsRes] = await Promise.all([
    loadViewerData(admin, data.id, userId, isOrganizer, knownStatus),
    admin.from('event_timeline').select('*').eq('event_id', data.id)
      .order('start_time', { ascending: true }).order('sort_order', { ascending: true }),
    admin.from('event_announcements').select('*').eq('event_id', data.id)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),

  ]);
  const participantStatus = viewer.status;
  const isParticipant = participantStatus === 'joined';
  if (viewer.meetingUrl) data.event_meeting_url = viewer.meetingUrl;

  let networkProfile = null;
  let suggestedMatches = [];
  
  if (isParticipant || isOrganizer) {
    // Hosts can switch to attendee view, so load their event profile too.
    // Fetch profile and matches in parallel to speed up load time.
    const { profileRes, matches } = viewer;
    const { data: profileData, error: profileError } = profileRes;
    suggestedMatches = matches;

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
    imageUrls: {}
  };
};
