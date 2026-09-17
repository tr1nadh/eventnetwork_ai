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
    throw error(403, 'Forbidden. Only the organizer can modify the timeline.');
  }

  return eventData;
}

export async function GET({ params }) {
  const eventId = params.id;
  const admin = createSupabaseAdminClient();

  const { data: timelineItems, error: fetchError } = await admin
    .from('event_timeline')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true })
    .order('sort_order', { ascending: true });

  if (fetchError) {
    throw error(500, fetchError.message);
  }

  return json({ timeline: timelineItems ?? [] });
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
  const description = body?.description?.trim() || null;
  const location = body?.location?.trim() || null;
  const category = body?.category?.trim() || 'general';
  const speaker_name = body?.speaker_name?.trim() || null;
  const speaker_role = body?.speaker_role?.trim() || null;
  const speaker_avatar_url = body?.speaker_avatar_url?.trim() || null;
  const sort_order = Number(body?.sort_order ?? 0);

  if (!title) {
    throw error(400, 'Title is required.');
  }
  if (!body?.start_time || !body?.end_time) {
    throw error(400, 'Start time and End time are required.');
  }

  const startTimeDate = new Date(body.start_time);
  const endTimeDate = new Date(body.end_time);

  if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
    throw error(400, 'Invalid start or end time date format.');
  }

  if (endTimeDate <= startTimeDate) {
    throw error(400, 'End time must be after start time.');
  }

  const payload = {
    event_id: eventId,
    title,
    description,
    location,
    category,
    start_time: startTimeDate.toISOString(),
    end_time: endTimeDate.toISOString(),
    speaker_name,
    speaker_role,
    speaker_avatar_url,
    sort_order,
    created_by: locals.user.id
  };

  const { data: newItem, error: insertError } = await admin
    .from('event_timeline')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    throw error(400, insertError.message);
  }

  return json({ item: newItem });
}

export async function PUT({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();
  await checkOrganizerPermission(admin, eventId, locals.user.id);

  const body = await request.json().catch(() => null);
  const itemId = body?.id;

  if (!itemId) {
    throw error(400, 'Timeline item ID is required.');
  }

  const title = body?.title?.trim();
  const description = body?.description?.trim() || null;
  const location = body?.location?.trim() || null;
  const category = body?.category?.trim() || 'general';
  const speaker_name = body?.speaker_name?.trim() || null;
  const speaker_role = body?.speaker_role?.trim() || null;
  const speaker_avatar_url = body?.speaker_avatar_url?.trim() || null;
  const sort_order = body?.sort_order !== undefined ? Number(body.sort_order) : undefined;

  if (!title) {
    throw error(400, 'Title is required.');
  }

  const updatePayload = {
    title,
    description,
    location,
    category,
    speaker_name,
    speaker_role,
    speaker_avatar_url
  };

  if (sort_order !== undefined) updatePayload.sort_order = sort_order;

  if (body?.start_time) {
    const startTimeDate = new Date(body.start_time);
    if (isNaN(startTimeDate.getTime())) throw error(400, 'Invalid start time format.');
    updatePayload.start_time = startTimeDate.toISOString();
  }

  if (body?.end_time) {
    const endTimeDate = new Date(body.end_time);
    if (isNaN(endTimeDate.getTime())) throw error(400, 'Invalid end time format.');
    updatePayload.end_time = endTimeDate.toISOString();
  }

  if (updatePayload.start_time && updatePayload.end_time) {
    if (new Date(updatePayload.end_time) <= new Date(updatePayload.start_time)) {
      throw error(400, 'End time must be after start time.');
    }
  }

  const { data: updatedItem, error: updateError } = await admin
    .from('event_timeline')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select()
    .single();

  if (updateError) {
    throw error(400, updateError.message);
  }

  return json({ item: updatedItem });
}

export async function DELETE({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();
  await checkOrganizerPermission(admin, eventId, locals.user.id);

  const url = new URL(request.url);
  let itemId = url.searchParams.get('id');

  if (!itemId) {
    const body = await request.json().catch(() => null);
    itemId = body?.id;
  }

  if (!itemId) {
    throw error(400, 'Timeline item ID is required.');
  }

  const { error: deleteError } = await admin
    .from('event_timeline')
    .delete()
    .eq('id', itemId)
    .eq('event_id', eventId);

  if (deleteError) {
    throw error(400, deleteError.message);
  }

  return json({ success: true });
}
