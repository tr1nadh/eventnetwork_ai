import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cardPayload(body) {
  const display_name = clean(body?.display_name);
  const what_i_do = clean(body?.what_i_do);
  const about_me = clean(body?.about_me);
  if (!display_name || !what_i_do || !about_me) return null;
  return { title: 'My network card', display_name, what_i_do, about_me };
}

async function getUser(cookies) {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return user;
}

export async function GET({ cookies }) {
  const user = await getUser(cookies);
  if (!user) return json({ error: 'Unauthenticated.' }, { status: 401 });
  const { data, error: queryError } = await createSupabaseAdminClient()
    .from('network_cards')
    .select('id, title, display_name, what_i_do, about_me, is_archived, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });
  if (queryError) return json({ error: queryError.message }, { status: 500 });
  return json({ cards: data ?? [] });
}

export async function POST({ request, cookies }) {
  const user = await getUser(cookies);
  if (!user) return json({ error: 'Unauthenticated.' }, { status: 401 });
  const payload = cardPayload(await request.json().catch(() => null));
  if (!payload) return json({ error: 'Name, what you do, and about you are required.' }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from('network_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, { status: 500 });
  if (existing) return json({ error: 'You already have a network card. Edit it instead.' }, { status: 409 });
  const { data, error: insertError } = await admin
    .from('network_cards')
    .insert({ ...payload, user_id: user.id })
    .select('id, title, display_name, what_i_do, about_me, is_archived, created_at, updated_at')
    .single();
  if (insertError) return json({ error: insertError.message }, { status: 500 });
  return json({ card: data }, { status: 201 });
}
