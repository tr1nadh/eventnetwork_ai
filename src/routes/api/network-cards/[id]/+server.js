import { json } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }

export async function PATCH({ params, request, locals }) {
  const user = locals.user;
  if (!user) return json({ error: 'Unauthenticated.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const update = {};
  for (const field of ['what_i_do', 'about_me']) {
    if (body?.[field] !== undefined) update[field] = clean(body[field]);
  }
  if (body?.is_archived !== undefined) update.is_archived = Boolean(body.is_archived);
  update.updated_at = new Date().toISOString();
  const { data, error: updateError } = await createSupabaseAdminClient().from('network_cards').update(update).eq('id', params.id).eq('user_id', user.id).select('id, title, display_name, what_i_do, about_me, is_archived, created_at, updated_at').maybeSingle();
  if (updateError) return json({ error: updateError.message }, { status: 500 });
  if (!data) return json({ error: 'Network card not found.' }, { status: 404 });
  return json({ card: data });
}

export async function DELETE({ params, locals }) {
  const user = locals.user;
  if (!user) return json({ error: 'Unauthenticated.' }, { status: 401 });
  const { error: deleteError } = await createSupabaseAdminClient().from('network_cards').delete().eq('id', params.id).eq('user_id', user.id);
  if (deleteError) return json({ error: deleteError.message }, { status: 500 });
  return json({ success: true });
}
