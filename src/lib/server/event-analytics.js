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

async function exactCount(query) {
  const { count, error: failure } = await query;
  if (failure) throw error(500, failure.message);
  return count ?? 0;
}

async function loadProfiles(admin, eventId) {
  const profiles = [];
  for (;;) {
    const { data, count, error: failure } = await admin.from('network_profiles')
      .select('display_name, what_i_do, looking_for, about_me', { count: 'exact' })
      .eq('event_id', eventId).order('user_id').range(profiles.length, profiles.length + 499);
    if (failure) throw error(500, failure.message);
    profiles.push(...data);
    if (!data.length || profiles.length >= count) return profiles;
  }
}

export async function loadOrganizerAnalytics(admin, eventId) {
  const countRows = table => admin.from(table).select('*', { count: 'exact', head: true }).eq('event_id', eventId);
  const [totalParticipants, profiles, aiMatchesGenerated, connectionRequests, acceptedConnectionCount, peopleMet] = await Promise.all([
    exactCount(countRows('event_participants').eq('status', 'joined')),
    loadProfiles(admin, eventId),
    exactCount(countRows('matches')),
    exactCount(countRows('connections')),
    exactCount(countRows('connections').eq('status', 'accepted')),
    exactCount(countRows('connections').eq('status', 'accepted').not('met_at', 'is', null)),
  ]);

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
