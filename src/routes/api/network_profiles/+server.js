import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

// ------------------------------------------------------------
// GET – retrieve the current user's networking profile for an event
// ------------------------------------------------------------
export async function GET({ url, cookies }) {
  // Accept event_id as query param e.g. /api/network_profiles?event_id=xxxx
  const eventId = url.searchParams.get('event_id');
  if (!eventId) {
    return json({ error: 'Missing event_id' }, { status: 400 });
  }
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { data: profile, error: fetchError } = await supabase
    .from('network_profiles')
    .select('display_name, profession, looking_for, event_expectation')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return json({ error: fetchError.message }, { status: 500 });
  }

  if (!profile) {
    return json({ profile: null });
  }

  return json({
    profile: {
      whoTheyAre: profile.display_name,
      whatTheyDo: profile.profession,
      whoTheyWant: Array.isArray(profile.looking_for)
        ? profile.looking_for.join(', ')
        : profile.looking_for,
      expectations: profile.event_expectation
    }
  });
}


// ------------------------------------------------------------
// POST – create or update the networking profile for an event
// ------------------------------------------------------------
export async function POST({ request, cookies }) {
  const { profile, event_id } = await request.json();
  console.log('POST /api/network_profiles payload', { profile, event_id });
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error in POST network_profiles', authError);
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }


  const { whoTheyAre, whatTheyDo, whoTheyWant, expectations } = profile;

  const lookingForArray = typeof whoTheyWant === 'string'
    ? whoTheyWant.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const { data: upsertData, error } = await supabase.from('network_profiles')
    .upsert(
      {
        user_id: user.id,
        event_id,
        display_name: whoTheyAre,
        profession: whatTheyDo,
        looking_for: lookingForArray,
        event_expectation: expectations
      },
      { onConflict: 'user_id,event_id', returning: 'representation' }
    )
    .select();

  if (error) {
    console.error('Supabase upsert error', error);
    return json({ error: error.message }, { status: 500 });
  }

  const saved = upsertData && upsertData.length ? upsertData[0] : null;
  console.log('Network profile saved', saved);
  return json({ success: true, profile: saved });
}
