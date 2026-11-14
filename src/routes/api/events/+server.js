import { listEvents } from '$lib/server/event-list';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SELECT_FIELDS = 'id, name, description, slug, created_by, created_at, updated_at, venue_map, start_time, end_time, location, google_map_url, event_meeting_url, event_format, attendees_count, max_attendees, is_attendees_register_limited, event_logo_url, event_banner_url, is_public, allow_join_after_start, is_approval_required, is_venue_enabled, is_network_enabled, is_announcements_enabled';
const MAX_ATTENDEES_REGEX = /^[1-9]\d*$/;

function parseMaxAttendees(value) {
  const text = String(value ?? '').trim();
  if (!MAX_ATTENDEES_REGEX.test(text)) return null;

  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= 4 ? parsed : null;
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  const slug = (body?.id?.trim() || (name ? slugify(name) : '')).toLowerCase();

  if (!name || !slug) {
    throw error(400, 'Name and ID are required.');
  }

  const event_logo_url = body?.event_logo_url?.trim() || null;
  const event_banner_url = body?.event_banner_url?.trim() || null;


  const now = new Date();
  const startTimeDate = body?.start_time ? new Date(body.start_time) : now;
  const endTimeDate = body?.end_time ? new Date(body.end_time) : new Date(now.getTime() + 2 * 60 * 60 * 1000);

  if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
    throw error(400, 'Invalid date format.');
  }

  if (startTimeDate < new Date(now.getTime() - 5 * 60 * 1000)) {
    throw error(400, 'Start time cannot be in the past.');
  }

  if (endTimeDate <= startTimeDate) {
    throw error(400, 'End time must be greater than start time.');
  }

  const startTime = startTimeDate.toISOString();
  const endTime = endTimeDate.toISOString();
  const location = body?.location?.trim() || null;
  const google_map_url = body?.google_map_url?.trim() || null;
  const event_meeting_url = body?.event_meeting_url?.trim() || null;
  const event_format = ['online', 'offline', 'hybrid'].includes(body?.event_format) ? body.event_format : 'offline';
  const is_public = body?.is_public !== undefined ? Boolean(body.is_public) : true;
  const allow_join_after_start = body?.allow_join_after_start !== undefined ? Boolean(body.allow_join_after_start) : true;
  const is_approval_required = Boolean(body?.is_approval_required);
  const is_venue_enabled = body?.is_venue_enabled !== undefined ? Boolean(body.is_venue_enabled) : true;
  const is_network_enabled = Boolean(body?.is_network_enabled);
  const is_announcements_enabled = body?.is_announcements_enabled !== undefined ? Boolean(body.is_announcements_enabled) : true;
  const max_attendees = parseMaxAttendees(body?.max_attendees ?? 20);
  if (max_attendees === null) {
    throw error(400, 'Max attendees must be a whole number of at least 4.');
  }
  if (body?.is_attendees_register_limited !== undefined && typeof body.is_attendees_register_limited !== 'boolean') {
    throw error(400, 'Attendees register limited must be true or false.');
  }
  const is_attendees_register_limited = body?.is_attendees_register_limited ?? true;

  const admin = createSupabaseAdminClient();

  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    throw error(500, lookupError.message);
  }

  if (existingEvent) {
    throw error(409, 'That ID is already in use. Please choose another one.');
  }

  const { data, error: insertError } = await admin
    .from('events')
    .insert({
      name,
      description,
      slug,
      created_by: locals.user.id,
      start_time: startTime,
      end_time: endTime,
      location,
      google_map_url,
      event_meeting_url,
      event_format,
      max_attendees,
      is_attendees_register_limited,
      event_logo_url,
      event_banner_url,
      is_public,
      allow_join_after_start,
      is_approval_required,
      is_venue_enabled,
      is_network_enabled,
      is_announcements_enabled
    })
    .select(SELECT_FIELDS)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw error(409, 'That ID is already in use. Please choose another one.');
    }

    throw error(400, insertError.message);
  }

  return json({ event: data }, { status: 201 });
}

export async function GET({ url, locals }) {
  return json(await listEvents(locals.user, url.searchParams, {
    includeVenueMap: url.searchParams.get('view') !== 'cards',
    includeImages: url.searchParams.get('view') !== 'cards',
  }));
}
