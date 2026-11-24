import { error } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { signEventImages } from './event-images';
import { listEventsFromTables } from './event-list-fallback';
import { parseDate } from '@internationalized/date';

let retryRpcAfter = 0;

async function loadPage(admin, args) {
  if (Date.now() >= retryRpcAfter) {
    const result = await admin.rpc('list_event_page', args);
    if (!result.error) return result.data;
    if (result.error.code !== 'PGRST202') throw error(500, result.error.message);
    retryRpcAfter = Date.now() + 60000;
  }
  return listEventsFromTables(admin, args);
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? number : fallback;
}

function discoveryTimeZone(value) {
  if (!value || !/^[A-Za-z][A-Za-z0-9_+/-]{0,79}$/.test(value)) return 'UTC';
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function dateBoundary(date, timeZone, nextDay = false) {
  if (!date) return null;
  try {
    const day = parseDate(date);
    return (nextDay ? day.add({ days: 1 }) : day).toDate(timeZone).toISOString();
  } catch {
    throw error(400, 'Use YYYY-MM-DD for event date filters.');
  }
}

export async function listEvents(user, params, { includeVenueMap = false, includeImages = true } = {}) {
  if (!user) throw error(401, 'Unauthorized.');
  const filter = params.get('filter') || 'all';
  const discover = filter === 'discover';
  const page = positiveInteger(params.get('page'), 1);
  const requestedLimit = positiveInteger(params.get('limit'), discover ? 9 : 12);
  const limit = discover ? requestedLimit : Math.min(50, requestedLimit);
  const start = params.get('date') || params.get('date_start');
  const end = params.get('date') || params.get('date_end');
  const timeZone = discoveryTimeZone(discover && params.get('tz'));
  const admin = createSupabaseAdminClient();
  const { events, total, ...metadata } = await loadPage(admin, {
    viewer: user.id, list_filter: filter, search_text: params.get('q') || '',
    format_filter: params.get('format') || '', status_filter: params.get('status') || 'all',
    period_start: discover ? dateBoundary(start, timeZone) : null,
    period_end: discover ? dateBoundary(end, timeZone, true) : null,
    page_number: page, page_size: limit, include_venue_map: includeVenueMap,
    ...(discover ? { viewer_time_zone: timeZone } : {}),
  });
  const urls = includeImages ? await signEventImages(admin, events) : {};
  return {
    ...metadata,
    events: events.map(event => ({
      ...event, logo_src: urls[event.event_logo_url], banner_src: urls[event.event_banner_url],
    })),
    pagination: {
      page, limit, total, hasMore: page * limit < total,
      ...(discover ? {} : { totalPages: Math.max(1, Math.ceil(total / limit)) }),
    },
  };
}
