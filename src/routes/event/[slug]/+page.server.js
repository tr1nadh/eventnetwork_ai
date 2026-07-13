import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoEvent } from '$lib/demo';
import { error } from '@sveltejs/kit';

const commonWords = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'about',
  'people',
  'working',
  'looking',
  'meet',
  'build',
  'building'
]);

function parseListValue(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (e) {}

  return text
    .split(/[,;\n|/]+|\s+\band\b\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function increment(map, value) {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .trim();

  if (!cleaned || cleaned.length < 2) return;
  map.set(cleaned, (map.get(cleaned) ?? 0) + 1);
}

function topEntries(map, fallbackLabel) {
  const entries = [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  return entries.length ? entries : [{ label: fallbackLabel, count: 0 }];
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

async function loadOrganizerAnalytics(admin, eventId) {
  const [participantsResult, profilesResult, matchesResult, connectionsResult] = await Promise.all([
    admin
      .from('event_participants')
      .select('user_id, status')
      .eq('event_id', eventId)
      .eq('status', 'joined'),
    admin
      .from('network_profiles')
      .select('display_name, what_i_do, looking_for, about_me')
      .eq('event_id', eventId),
    admin
      .from('matches')
      .select('id, user_id, matched_user_id')
      .eq('event_id', eventId),
    admin
      .from('connections')
      .select('id, status, met_at')
      .eq('event_id', eventId)
  ]);

  const queryError =
    participantsResult.error ||
    profilesResult.error ||
    matchesResult.error ||
    connectionsResult.error;

  if (queryError) {
    throw error(500, queryError.message);
  }

  const participants = participantsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const matches = matchesResult.data ?? [];
  const connections = connectionsResult.data ?? [];
  const acceptedConnections = connections.filter((connection) => connection.status === 'accepted');
  const metConnections = acceptedConnections.filter((connection) => connection.met_at);

  const skillCounts = new Map();
  for (const profile of profiles) {
    for (const skill of parseListValue(profile.what_i_do)) {
      increment(skillCounts, skill);
    }

    if (!profile.what_i_do) {
      const words = `${profile.about_me ?? ''}`
        .toLowerCase()
        .split(/[^a-z0-9+]+/)
        .filter((word) => word.length > 2 && !commonWords.has(word));
      for (const word of words) increment(skillCounts, word);
    }
  }

  const goalCounts = new Map();
  for (const profile of profiles) {
    for (const goal of parseListValue(profile.looking_for)) {
      increment(goalCounts, goal);
    }
  }

  const totalParticipants = participants.length;
  const aiMatchesGenerated = matches.length;
  const connectionRequests = connections.length;
  const acceptedConnectionCount = acceptedConnections.length;
  const peopleMet = metConnections.length;
  const profilesCompleted = profiles.length;
  const connectionAcceptanceRate = percent(acceptedConnectionCount, connectionRequests);
  const qrMeetCompletionRate = percent(peopleMet, acceptedConnectionCount);
  const topSkills = topEntries(skillCounts, 'No skills captured yet');
  const topGoals = topEntries(goalCounts, 'No goals captured yet');

  return {
    totalParticipants,
    aiMatchesGenerated,
    connectionRequests,
    acceptedConnections: acceptedConnectionCount,
    peopleMet,
    connectionAcceptanceRate,
    qrMeetCompletionRate,
    networkingFunnel: [
      { label: 'Participants', value: totalParticipants },
      { label: 'Profiles Completed', value: profilesCompleted },
      { label: 'AI Matches', value: aiMatchesGenerated },
      { label: 'Connection Requests', value: connectionRequests },
      { label: 'Accepted', value: acceptedConnectionCount },
      { label: 'People Met', value: peopleMet }
    ],
    topSkills,
    topGoals,
    organizerSummary: totalParticipants
      ? `Your event has ${totalParticipants} participant${totalParticipants === 1 ? '' : 's'}, ${aiMatchesGenerated} AI match${aiMatchesGenerated === 1 ? '' : 'es'}, and a ${connectionAcceptanceRate}% connection acceptance rate. ${topGoals[0]?.count ? `The strongest networking goal is "${topGoals[0].label}".` : 'As attendees complete profiles, richer goal insights will appear here.'}`
      : 'Your analytics dashboard is ready. Participant engagement, AI matches, connection activity, and meeting completion will appear as attendees join.'
  };
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
      user: locals.user,
      isOrganizer: false,
      isParticipant: false,
      networkProfile: null,
      analytics: null
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select('id, name, description, slug, venue_map, created_by, created_at, updated_at')
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

  const isOrganizer = !!locals.user && data.created_by === locals.user.id;

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
    isOrganizer,
    isParticipant,
    networkProfile,
    analytics: isOrganizer ? await loadOrganizerAnalytics(admin, data.id) : null
  };
};
