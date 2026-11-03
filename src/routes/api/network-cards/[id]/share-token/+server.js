import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { createNetworkCardQrToken } from '$lib/server/network-card-qr';

export async function POST({ params, cookies }) {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthenticated.' }, { status: 401 });

  const { data: card, error: cardError } = await createSupabaseAdminClient()
    .from('network_cards')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();
  if (cardError) return json({ error: cardError.message }, { status: 500 });
  if (!card) return json({ error: 'Network card not found.' }, { status: 404 });

  return json(createNetworkCardQrToken(card.id, user.id));
}
