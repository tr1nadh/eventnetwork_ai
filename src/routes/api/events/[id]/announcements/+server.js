import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

async function checkOrganizerPermission(admin, eventId, userId) {
  const { data: eventData, error: lookupError } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  if (lookupError || !eventData) {
    throw error(404, 'Event not found.');
  }

  if (eventData.created_by !== userId) {
    throw error(403, 'Forbidden. Only the organizer can manage announcements.');
  }

  return eventData;
}

export async function GET({ params }) {
  const eventId = params.id;
  const admin = createSupabaseAdminClient();

  const { data: announcements, error: fetchError } = await admin
    .from('event_announcements')
    .select('*')
    .eq('event_id', eventId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (fetchError) {
    throw error(500, fetchError.message);
  }

  return json({ announcements: announcements ?? [] });
}

export async function POST({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();
  await checkOrganizerPermission(admin, eventId, locals.user.id);

  const body = await request.json().catch(() => null);
  const title = body?.title?.trim();
  const content = body?.content?.trim();
  const priority = ['low', 'normal', 'high', 'urgent'].includes(body?.priority) ? body.priority : 'normal';
  const is_pinned = Boolean(body?.is_pinned);

  if (!title) {
    throw error(400, 'Announcement title is required.');
  }
  if (!content) {
    throw error(400, 'Announcement content is required.');
  }

  const payload = {
    event_id: eventId,
    title,
    content,
    priority,
    is_pinned,
    created_by: locals.user.id
  };

  const { data: newItem, error: insertError } = await admin
    .from('event_announcements')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    throw error(400, insertError.message);
  }

  return json({ announcement: newItem }, { status: 201 });
}

export async function PUT({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();
  await checkOrganizerPermission(admin, eventId, locals.user.id);

  const body = await request.json().catch(() => null);
  const announcementId = body?.id;

  if (!announcementId) {
    throw error(400, 'Announcement ID is required.');
  }

  const title = body?.title?.trim();
  const content = body?.content?.trim();
  const priority = body?.priority && ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : undefined;
  const is_pinned = body?.is_pinned !== undefined ? Boolean(body.is_pinned) : undefined;

  if (!title) {
    throw error(400, 'Title is required.');
  }
  if (!content) {
    throw error(400, 'Content is required.');
  }

  const updatePayload = {
    title,
    content,
    updated_at: new Date().toISOString()
  };

  if (priority !== undefined) updatePayload.priority = priority;
  if (is_pinned !== undefined) updatePayload.is_pinned = is_pinned;

  const { data: updatedItem, error: updateError } = await admin
    .from('event_announcements')
    .update(updatePayload)
    .eq('id', announcementId)
    .eq('event_id', eventId)
    .select()
    .single();

  if (updateError) {
    throw error(400, updateError.message);
  }

  return json({ announcement: updatedItem });
}

export async function DELETE({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();
  await checkOrganizerPermission(admin, eventId, locals.user.id);

  const url = new URL(request.url);
  let announcementId = url.searchParams.get('id');

  if (!announcementId) {
    const body = await request.json().catch(() => null);
    announcementId = body?.id;
  }

  if (!announcementId) {
    throw error(400, 'Announcement ID is required.');
  }

  const { error: deleteError } = await admin
    .from('event_announcements')
    .delete()
    .eq('id', announcementId)
    .eq('event_id', eventId);

  if (deleteError) {
    throw error(400, deleteError.message);
  }

  return json({ success: true });
}
