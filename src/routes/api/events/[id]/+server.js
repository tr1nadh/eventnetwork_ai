import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

export async function PUT({ request, params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  const slug = body?.slug?.trim().toLowerCase();
  const venue_map = body?.venue_map !== undefined ? body.venue_map : undefined;

  if (!name || !slug) {
    throw error(400, 'Name and Slug are required.');
  }

  const admin = createSupabaseAdminClient();

  // Validate ownership
  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  if (lookupError || !existingEvent) {
    throw error(404, 'Event not found.');
  }

  if (existingEvent.created_by !== locals.user.id) {
    throw error(403, 'Forbidden. Only the organizer can edit this event.');
  }

  // Ensure slug is unique if changed
  const { data: slugCheck, error: slugCheckError } = await admin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .neq('id', eventId)
    .maybeSingle();

  if (slugCheck) {
    throw error(409, 'That slug is already in use. Please choose another one.');
  }

  // Update
  const updatePayload = { name, description, slug };
  if (venue_map !== undefined) updatePayload.venue_map = venue_map;
  if (body?.start_time) updatePayload.start_time = new Date(body.start_time).toISOString();
  if (body?.end_time) updatePayload.end_time = new Date(body.end_time).toISOString();
  if (body?.location !== undefined) updatePayload.location = body.location ? body.location.trim() : null;
  if (body?.google_map_url !== undefined) updatePayload.google_map_url = body.google_map_url ? body.google_map_url.trim() : null;
  if (body?.event_format && ['online', 'offline', 'hybrid'].includes(body.event_format)) {
    updatePayload.event_format = body.event_format;
  }
  if (body?.is_approval_required !== undefined) {
    updatePayload.is_approval_required = Boolean(body.is_approval_required);
  }
  if (body?.is_venue_enabled !== undefined) {
    updatePayload.is_venue_enabled = Boolean(body.is_venue_enabled);
  }

  const { data: updatedEvent, error: updateError } = await admin
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      throw error(409, 'That slug is already in use. Please choose another one.');
    }
    throw error(400, updateError.message);
  }

  return json({ event: updatedEvent });
}

export async function DELETE({ params, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const eventId = params.id;
  const admin = createSupabaseAdminClient();

  // Validate ownership
  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  if (lookupError || !existingEvent) {
    throw error(404, 'Event not found.');
  }

  if (existingEvent.created_by !== locals.user.id) {
    throw error(403, 'Forbidden. Only the organizer can delete this event.');
  }

  const { error: deleteError } = await admin
    .from('events')
    .delete()
    .eq('id', eventId);

  if (deleteError) {
    throw error(500, deleteError.message);
  }

  return json({ success: true });
}
