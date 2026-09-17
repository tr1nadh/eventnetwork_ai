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

  // Validate ownership and fetch existing event schedule
  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('created_by, start_time, end_time')
    .eq('id', eventId)
    .single();

  if (lookupError || !existingEvent) {
    throw error(404, 'Event not found.');
  }

  if (existingEvent.created_by !== locals.user.id) {
    throw error(403, 'Forbidden. Only the organizer can edit this event.');
  }

  const now = new Date();

  // 1. Ended Events: Lock settings completely
  if (existingEvent.end_time && new Date(existingEvent.end_time) < now) {
    throw error(400, 'This event has ended. Settings are locked and cannot be modified.');
  }

  // 2. Running / Live Events: Lock start_time modifications
  const isLive = existingEvent.start_time && new Date(existingEvent.start_time) <= now;
  if (isLive && body?.start_time) {
    const requestedStart = new Date(body.start_time).toISOString();
    const existingStart = new Date(existingEvent.start_time).toISOString();
    if (requestedStart !== existingStart) {
      throw error(400, 'Start time cannot be changed once the event has started.');
    }
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

  let startTimeDate = null;
  let endTimeDate = null;

  if (body?.start_time !== undefined) {
    if (body.start_time === null) {
      updatePayload.start_time = null;
    } else {
      startTimeDate = new Date(body.start_time);
      if (isNaN(startTimeDate.getTime())) {
        throw error(400, 'Invalid start time format.');
      }
      // Block past start dates for upcoming events (5 minute buffer for clock skew)
      if (!isLive && startTimeDate < new Date(now.getTime() - 5 * 60 * 1000)) {
        throw error(400, 'Start time cannot be in the past.');
      }
      updatePayload.start_time = startTimeDate.toISOString();
    }
  }

  if (body?.end_time !== undefined) {
    if (body.end_time === null) {
      updatePayload.end_time = null;
    } else {
      endTimeDate = new Date(body.end_time);
      if (isNaN(endTimeDate.getTime())) {
        throw error(400, 'Invalid end time format.');
      }
      updatePayload.end_time = endTimeDate.toISOString();
    }
  }

  const effectiveStart = startTimeDate || (existingEvent.start_time ? new Date(existingEvent.start_time) : null);
  const effectiveEnd = endTimeDate || (existingEvent.end_time ? new Date(existingEvent.end_time) : null);

  if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
    throw error(400, 'End time must be greater than start time.');
  }

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
  if (body?.is_network_enabled !== undefined) {
    updatePayload.is_network_enabled = Boolean(body.is_network_enabled);
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
