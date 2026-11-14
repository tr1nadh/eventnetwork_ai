export const BUCKET = 'Event_images';

export function getStoragePath(value) {
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

export function isEventImagePath(path) {
  return /^events\/[0-9a-f-]+\/[a-z0-9-]+\/(logo|banner)-\d+\.(jpg|jpeg|png|webp)$/i.test(path);
}

export async function signEventImages(admin, events) {
  const originals = events.flatMap(event => [event.event_logo_url, event.event_banner_url]).filter(Boolean);
  const paths = [...new Set(originals.map(getStoragePath).filter(isEventImagePath))];
  if (!paths.length) return {};
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) return {};
  const urls = new Map(data.filter(item => item.signedUrl && !item.error).map(item => [item.path, item.signedUrl]));
  return Object.fromEntries(originals.flatMap(value => {
    const url = urls.get(getStoragePath(value));
    return url ? [[value, url]] : [];
  }));
}
