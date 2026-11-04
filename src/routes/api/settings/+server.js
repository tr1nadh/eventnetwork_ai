import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function POST({ request, cookies }) {
  try {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthenticated.' }, { status: 401 });

    const name = cleanName((await request.json().catch(() => ({}))).name);
    if (name.length < 2 || name.length > 80) {
      return json({ error: 'Enter a name between 2 and 80 characters.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const metadata = { ...(user.user_metadata ?? {}), full_name: name, name, display_name: name };
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, { user_metadata: metadata });
    if (authUpdateError) throw new Error(`Could not update account name: ${authUpdateError.message}`);

    const now = new Date().toISOString();
    const { error: userError } = await admin.from('users').update({ name, updated_at: now }).eq('id', user.id);
    if (userError) throw new Error(`Could not update user profile: ${userError.message}`);

    const { error: cardError } = await admin.from('network_cards').update({ display_name: name, updated_at: now }).eq('user_id', user.id);
    if (cardError) throw new Error(`Could not update Network Card: ${cardError.message}`);

    const { error: profileError } = await admin.from('network_profiles').update({ display_name: name }).eq('user_id', user.id);
    if (profileError) throw new Error(`Could not update networking profiles: ${profileError.message}`);

    return json({ name });
  } catch (error) {
    console.error('Settings name update failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Could not update settings.' }, { status: 500 });
  }
}
