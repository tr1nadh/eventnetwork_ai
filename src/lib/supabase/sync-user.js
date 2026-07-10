import { createSupabaseAdminClient } from '$lib/supabase/admin';

function resolveUserName(user) {
  const metadata = user.user_metadata ?? {};
  return metadata.full_name ?? metadata.name ?? metadata.display_name ?? user.email?.split('@')[0] ?? 'User';
}

export async function syncUserRecord(user) {
  if (!user.email) {
    return false;
  }

  const admin = createSupabaseAdminClient();

  const now = new Date().toISOString();
  const payload = {
    id: user.id,
    name: resolveUserName(user),
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    updated_at: now
  };

  const { error } = await admin.from('users').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  return true;
}
