import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { verifyNetworkCardQrToken } from '$lib/server/network-card-qr';

export async function POST({ request, cookies }) {
  const { token } = await request.json().catch(() => ({}));
  const qrData = verifyNetworkCardQrToken(token);
  if (!qrData) return json({ error: 'This Network Card QR code has expired or is invalid.' }, { status: 400 });

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthenticated.' }, { status: 401 });
  if (user.id === qrData.ownerId) return json({ error: 'You cannot scan your own Network Card.' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: scannedCard, error: scannedCardError } = await admin
    .from('network_cards')
    .select('id, user_id, display_name')
    .eq('id', qrData.cardId)
    .eq('user_id', qrData.ownerId)
    .eq('is_archived', false)
    .maybeSingle();
  if (scannedCardError) return json({ error: scannedCardError.message }, { status: 500 });
  if (!scannedCard) return json({ error: 'This Network Card is no longer available.' }, { status: 404 });

  const pairFilter = `and(sender_user_id.eq.${user.id},receiver_user_id.eq.${scannedCard.user_id}),and(sender_user_id.eq.${scannedCard.user_id},receiver_user_id.eq.${user.id})`;
  const { data: existing, error: existingError } = await admin
    .from('connections')
    .select('id, status, met_at')
    .eq('connection_type', 'network_card')
    .or(pairFilter)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, { status: 500 });
  if (existing) return json({ connection: existing, already_connected: true, name: scannedCard.display_name });

  const now = new Date().toISOString();
  const { data: connection, error: insertError } = await admin
    .from('connections')
    .insert({
      sender_user_id: user.id,
      receiver_user_id: scannedCard.user_id,
      receiver_network_card_id: scannedCard.id,
      connection_type: 'network_card',
      status: 'accepted',
      met_at: now,
      updated_at: now
    })
    .select('id, status, met_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') return json({ already_connected: true, name: scannedCard.display_name });
    return json({ error: insertError.message }, { status: 500 });
  }

  return json({ connection, already_connected: false, name: scannedCard.display_name }, { status: 201 });
}
