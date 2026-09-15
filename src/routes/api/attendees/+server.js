import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoEvent, demoAttendees } from '$lib/demo';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET({ url, cookies }) {
  const eventParam = url.searchParams.get('event_id') || '';
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  if (!eventParam || eventParam === 'undefined' || eventParam === 'null') {
    return json({ attendees: [] });
  }

  // Support demo event fallback
  if (eventParam === demoEvent.slug || eventParam === 'demo-event') {
    const filtered = demoAttendees.filter((a) => {
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.about.toLowerCase().includes(q) ||
        a.lookingFor.toLowerCase().includes(q)
      );
    });
    return json({
      attendees: filtered.map((a, idx) => ({
        user_id: `demo-user-${idx + 1}`,
        name: a.name,
        role: a.role,
        about: a.about,
        looking_for: a.lookingFor,
        is_dummy: true,
        is_host: idx === 0,
        is_current_user: false,
        connectionStatus: 'none',
        connectionId: null
      }))
    });
  }

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdminClient();

  try {
    const isUuid = UUID_REGEX.test(eventParam);
    let eventData = null;

    if (isUuid) {
      const { data } = await admin
        .from('events')
        .select('id, created_by')
        .eq('id', eventParam)
        .maybeSingle();
      eventData = data;
    } else {
      const { data } = await admin
        .from('events')
        .select('id, created_by')
        .eq('slug', eventParam)
        .maybeSingle();
      eventData = data;
    }

    if (!eventData) {
      return json({ attendees: [] });
    }

    const realEventId = eventData.id;
    const hostUserId = eventData.created_by;

    // 1. Fetch joined participants from event_participants schema table
    const { data: participants, error: partError } = await admin
      .from('event_participants')
      .select('user_id, status, joined_at, checked_in_at')
      .eq('event_id', realEventId)
      .eq('status', 'joined');

    if (partError) {
      console.error('Error fetching event_participants:', partError);
      return json({ attendees: [] });
    }

    const participantUserIds = (participants || []).map((p) => p.user_id);

    // Include host if not in participants list
    if (hostUserId && !participantUserIds.includes(hostUserId)) {
      participantUserIds.push(hostUserId);
    }

    if (participantUserIds.length === 0) {
      return json({ attendees: [] });
    }

    // 2. Parallel fetch network_profiles, users info, and active user connections
    const [profilesRes, usersRes, connectionsRes] = await Promise.all([
      admin
        .from('network_profiles')
        .select('user_id, display_name, what_i_do, looking_for, about_me, is_dummy, created_at')
        .eq('event_id', realEventId)
        .in('user_id', participantUserIds),
      admin
        .from('users')
        .select('id, name, avatar_url')
        .in('id', participantUserIds),
      user
        ? admin
            .from('connections')
            .select('id, sender_user_id, receiver_user_id, status, met_at')
            .eq('event_id', realEventId)
            .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = {};
    for (const p of profilesRes.data || []) {
      profilesMap[p.user_id] = p;
    }

    const usersMap = {};
    for (const u of usersRes.data || []) {
      usersMap[u.id] = u;
    }

    const connections = connectionsRes.data || [];

    // 3. Map EVERY participant from event_participants (and host) into attendee items
    let attendees = participantUserIds.map((userId) => {
      const prof = profilesMap[userId];
      const userRec = usersMap[userId];

      let lookingForStr = prof?.looking_for ?? '';
      try {
        const parsed = JSON.parse(lookingForStr);
        if (Array.isArray(parsed)) {
          lookingForStr = parsed.join(', ');
        }
      } catch (e) {}

      const isHost = userId === hostUserId;
      const isCurrentUser = Boolean(user && userId === user.id);

      let connectionStatus = 'none'; // 'none' | 'sent' | 'received' | 'accepted' | 'met'
      let connectionId = null;

      if (user) {
        const conn = connections.find(
          (c) =>
            (c.sender_user_id === user.id && c.receiver_user_id === userId) ||
            (c.receiver_user_id === user.id && c.sender_user_id === userId)
        );

        if (conn) {
          connectionId = conn.id;
          if (conn.status === 'accepted') {
            connectionStatus = conn.met_at ? 'met' : 'connected';
          } else if (conn.sender_user_id === user.id) {
            connectionStatus = 'sent';
          } else {
            connectionStatus = 'received';
          }
        }
      }

      const name = prof?.display_name || userRec?.name || 'Attendee';
      const role = prof?.what_i_do || 'Participant';
      const about = prof?.about_me || '';

      return {
        user_id: userId,
        name,
        role,
        about,
        looking_for: lookingForStr,
        is_dummy: Boolean(prof?.is_dummy),
        is_host: isHost,
        is_current_user: isCurrentUser,
        connectionStatus,
        connectionId
      };
    });

    // 4. Apply search filter if query string `q` is provided
    if (q) {
      attendees = attendees.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.about.toLowerCase().includes(q) ||
        a.looking_for.toLowerCase().includes(q)
      );
    }

    // 5. Sort: Host first, Current User second, then Alphabetical
    attendees.sort((a, b) => {
      if (a.is_host) return -1;
      if (b.is_host) return 1;
      if (a.is_current_user) return -1;
      if (b.is_current_user) return 1;
      return a.name.localeCompare(b.name);
    });

    return json({ attendees });
  } catch (err) {
    console.error('Unhandled error in GET /api/attendees:', err);
    return json({ attendees: [] });
  }
}
