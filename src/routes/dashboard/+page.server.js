import { redirect, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

export async function load({ locals, cookies }) {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const supabase = createSupabaseServerClient(cookies);

  // Fetch recent events the user is involved in
  const { data: userEvents, error: eventsError } = await supabase
    .from('event_participants')
    .select('event_id, role, events(id, name, slug, created_at, description)')
    .eq('user_id', locals.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
  }

  // Calculate totals
  const totalEvents = userEvents ? userEvents.length : 0;
  
  // Fetch total connections count
  const { count: totalConnections, error: connectionsError } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`sender_user_id.eq.${locals.user.id},receiver_user_id.eq.${locals.user.id}`);

  if (connectionsError) {
    console.error("Error fetching connections count:", connectionsError);
  }

  return {
    user: locals.user,
    recentEvents: userEvents ? userEvents.map(ue => ({ ...ue.events, role: ue.role })) : [],
    stats: {
      totalEvents,
      totalConnections: totalConnections || 0,
    }
  };
}
