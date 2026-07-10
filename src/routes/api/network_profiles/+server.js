import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

export async function POST({ request, cookies }) {
  const { profile, event_id } = await request.json();
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { whoTheyAre, whatTheyDo, whoTheyWant, expectations } = profile;

  const { error } = await supabase.from('network_profiles').insert({
    user_id: user.id,
    event_id,
    display_name: whoTheyAre,
    profession: whatTheyDo,
    looking_for: [whoTheyWant],
    event_expectation: expectations
  });

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}
