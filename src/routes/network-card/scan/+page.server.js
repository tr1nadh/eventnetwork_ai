export function load({ locals, url }) {
  const token = url.searchParams.get('token');
  if (!token) {
    return { token: null, user: locals.user ?? null };
  }
  return { token, user: locals.user };
}
