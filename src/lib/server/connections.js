export async function getAcceptedConnectionForUser(supabase, connectionId, userId) {
  const { data: connection, error } = await supabase
    .from('connections')
    .select('id, status, sender_user_id, receiver_user_id')
    .eq('id', connectionId)
    .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!connection) {
    return null;
  }

  if (connection.status !== 'accepted') {
    return { ...connection, access: 'forbidden' };
  }

  return { ...connection, access: 'granted' };
}
