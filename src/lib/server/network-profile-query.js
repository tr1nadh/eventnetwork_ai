// Older event databases predate the simulation marker on networking profiles.
export async function selectNetworkProfiles(fields, query) {
  const result = await query(fields + ', is_dummy');
  if (result.error?.code === '42703' && /\bis_dummy\b/.test(result.error.message)) {
    return query(fields);
  }
  return result;
}
