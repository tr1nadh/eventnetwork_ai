export function sanitizeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\u0000-\u0020]/.test(value)) return '/events';
  const origin = 'https://app.invalid';
  const destination = new URL(value, origin);
  return destination.origin === origin && !destination.pathname.startsWith('//')
    ? destination.pathname + destination.search + destination.hash : '/events';
}
