import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

export async function load({ locals, cookies }) {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const supabase = createSupabaseServerClient(cookies);
  const userId = locals.user.id;

  // Fetch hosted events
  const { data: hostedEvents, error: hostedError } = await supabase
    .from('events')
    .select('id, name, slug, created_at, description')
    .eq('created_by', userId);

  if (hostedError) {
    console.error("Error fetching hosted events:", hostedError);
  }

  // Fetch joined events from event_participants
  const { data: participantRows, error: participantError } = await supabase
    .from('event_participants')
    .select('event_id, events(id, name, slug, created_at, description)')
    .eq('user_id', userId)
    .eq('status', 'joined');

  if (participantError) {
    console.error("Error fetching joined events:", participantError);
  }

  const hosted = (hostedEvents || []).map(e => ({ ...e, role: 'organizer' }));
  const joined = (participantRows || [])
    .filter(p => p.events)
    .map(p => ({ ...p.events, role: 'participant' }));

  // Combine and deduplicate (hosting takes precedence)
  const combinedMap = new Map();
  for (const item of [...hosted, ...joined]) {
    const existing = combinedMap.get(item.id);
    if (!existing || item.role === 'organizer') {
      combinedMap.set(item.id, item);
    }
  }

  const allEvents = Array.from(combinedMap.values());
  allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recentEvents = allEvents.slice(0, 5);
  const totalEvents = allEvents.length;

  // Fetch total connections count
  const { count: totalConnections, error: connectionsError } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`);

  if (connectionsError) {
    console.error("Error fetching connections count:", connectionsError);
  }

  return {
    user: locals.user,
    recentEvents,
    stats: {
      totalEvents,
      totalConnections: totalConnections || 0,
    }
  };
}
