import { createSupabaseAdminClient } from '$lib/supabase/admin';
export async function loadNetworkCards(userId) {
  const { data, error } = await createSupabaseAdminClient().from('network_cards')
    .select('id, title, display_name, what_i_do, about_me, is_archived, created_at, updated_at')
    .eq('user_id', userId).eq('is_archived', false).order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
