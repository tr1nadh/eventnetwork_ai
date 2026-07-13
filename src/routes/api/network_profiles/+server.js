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
    .select('display_name, what_i_do, looking_for, about_me')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return json({ error: fetchError.message }, { status: 500 });
  }

  if (!profile) {
    return json({ profile: null });
  }

  // Normalise looking_for: handle legacy JSON array strings
  let lookingForStr = profile.looking_for ?? '';
  try {
    const parsed = JSON.parse(lookingForStr);
    if (Array.isArray(parsed)) {
      lookingForStr = parsed.join(', ');
    }
  } catch (e) {
    // Keep as is if not valid JSON
  }

  return json({
    profile: {
      whoTheyAre: profile.display_name,
      whatTheyDo: profile.what_i_do,
      whoTheyWant: lookingForStr,
      expectations: profile.about_me
    }
  });
}


// ------------------------------------------------------------
// POST – create or update the networking profile for an event
// ------------------------------------------------------------
export async function POST({ request, cookies }) {
  const payload = await request.json().catch(() => ({}));
  const { profile, event_id } = payload;
  console.log('POST /api/network_profiles payload', { profile, event_id });
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error in POST network_profiles', authError);
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (!event_id) {
    return json({ error: 'event_id is required' }, { status: 400 });
  }

  if (!profile) {
    return json({ error: 'profile is required' }, { status: 400 });
  }

  const { whoTheyAre, whatTheyDo, whoTheyWant, expectations, about_user_embed, looking_for_embed } = profile;

  // Ensure looking_for is stored as plain text – convert any array to a CSV string
  const lookingForStr = Array.isArray(whoTheyWant)
    ? whoTheyWant.join(', ')
    : (whoTheyWant ?? '');

  const { data: upsertData, error } = await supabase.from('network_profiles')
    .upsert(
      {
        user_id: user.id,
        event_id,
        display_name: whoTheyAre,
        what_i_do: whatTheyDo,
        looking_for: lookingForStr,
        about_me: expectations,
        about_user_embed,
        looking_for_embed,
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
