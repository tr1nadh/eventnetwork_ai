import { error, json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { getAcceptedConnectionForUser } from '$lib/server/connections';

export async function GET({ url, cookies }) {
  const connectionId = url.searchParams.get('connection_id');
  if (!connectionId) {
    throw error(400, 'Missing connection_id');
  }

  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw error(401, 'Unauthenticated');
  }

  const connection = await getAcceptedConnectionForUser(supabase, connectionId, user.id);
  if (!connection) {
    throw error(404, 'Connection not found');
  }
  if (connection.access !== 'granted') {
    throw error(403, 'Chat is only available for accepted connections');
  }

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, connection_id, sender_user_id, message, created_at, updated_at')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    throw error(500, messagesError.message);
  }

  return json({ messages: messages ?? [] });
}

export async function POST({ request, cookies }) {
  const { connection_id: connectionId, message } = await request.json();
  if (!connectionId) {
    throw error(400, 'Missing connection_id');
  }

  const content = message?.trim();
  if (!content) {
    throw error(400, 'Message is required');
  }

  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw error(401, 'Unauthenticated');
  }

  const connection = await getAcceptedConnectionForUser(supabase, connectionId, user.id);
  if (!connection) {
    throw error(404, 'Connection not found');
  }
  if (connection.access !== 'granted') {
    throw error(403, 'Chat is only available for accepted connections');
  }

  const { data: createdMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      connection_id: connectionId,
      sender_user_id: user.id,
      message: content
    })
    .select('id, connection_id, sender_user_id, message, created_at, updated_at')
    .single();

  if (insertError) {
    throw error(500, insertError.message);
  }

  return json({ message: createdMessage }, { status: 201 });
}
