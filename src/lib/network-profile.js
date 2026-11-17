export function networkingIntent(value) {
  if (typeof value === 'string' && value.trimStart().startsWith('[')) {
    try { value = JSON.parse(value); } catch { /* Also accept free text. */ }
  }
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.trim()).join(', ');
  return typeof value === 'string' ? value.trim() : '';
}

export function hasNetworkingProfile(profile) {
  return Boolean(profile?.what_i_do?.trim() && networkingIntent(profile.looking_for) && profile.about_me?.trim());
}
