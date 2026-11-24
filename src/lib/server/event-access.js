import { error } from '@sveltejs/kit';

export async function getEventParticipantStatus(admin, eventId, userId) {
  const { data, error: lookupError } = await admin.from('event_participants')
    .select('status').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (lookupError) throw error(500, 'Could not check event membership.');
  return data?.status;
}

export async function requireEventReadAccess(admin, event, userId) {
  if (!event) throw error(404, 'Event not found.');
  if (event.is_public === true || (userId && event.created_by === userId)) return;
  if (!userId) throw error(404, 'Event not found.');

  const status = await getEventParticipantStatus(admin, event.id, userId);
  if (status !== 'joined') throw error(404, 'Event not found.');
  return status;
}

export async function requireEventReadAccessById(admin, eventId, userId) {
  const { data: event, error: lookupError } = await admin.from('events')
    .select('id, created_by, is_public').eq('id', eventId).maybeSingle();
  if (lookupError) throw error(500, 'Could not look up event.');
  await requireEventReadAccess(admin, event, userId);
}
