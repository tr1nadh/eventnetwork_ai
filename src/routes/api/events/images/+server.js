import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { error, json, redirect } from '@sveltejs/kit';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const BUCKET = 'Event_images';

function getStoragePath(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index !== -1) return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    // Newly uploaded images store their bucket-relative path directly.
  }

  return value;
}

function isEventImagePath(path) {
  return /^events\/[0-9a-f-]+\/[a-z0-9-]+\/(logo|banner)-\d+\.(jpg|jpeg|png|webp)$/i.test(path);
}

export async function GET({ url }) {
  const path = getStoragePath(url.searchParams.get('path'));
  if (!path || !isEventImagePath(path)) throw error(400, 'Invalid event image.');

  const admin = createSupabaseAdminClient();
  const { data, error: signedUrlError } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signedUrlError || !data?.signedUrl) throw error(404, 'Event image not found.');

  throw redirect(302, data.signedUrl);
}

export async function POST({ request, locals }) {
  if (!locals.user) throw error(401, 'Unauthorized.');
  const formData = await request.formData();
  const file = formData.get('file');
  const type = formData.get('type');
  const slug = String(formData.get('slug') || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (!(file instanceof File) || !['logo', 'banner'].includes(type) || !slug) throw error(400, 'A valid image, image type, and event slug are required.');
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) throw error(400, 'Use a JPG, PNG, or WebP image smaller than 2 MB.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `events/${locals.user.id}/${slug}/${type}-${Date.now()}.${extension}`;
  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw error(400, uploadError.message);
  return json({ url: path });
}

export async function DELETE({ request, locals }) {
  if (!locals.user) throw error(401, 'Unauthorized.');

  const body = await request.json().catch(() => ({}));
  const path = getStoragePath(body?.path);
  if (!path || !isEventImagePath(path)) throw error(400, 'Invalid event image.');
  if (!path.startsWith(`events/${locals.user.id}/`)) throw error(403, 'You cannot remove this event image.');

  const admin = createSupabaseAdminClient();
  const { error: removeError } = await admin.storage.from(BUCKET).remove([path]);
  if (removeError) throw error(400, removeError.message);

  return json({ success: true });
}
