import { json } from '@sveltejs/kit';
import { generateEmbeddings } from '$lib/embeddings';
import { networkingIntent } from '$lib/network-profile';
import { checkAiQuota, refundAiCredit } from '$lib/server/ai-credits';

// ------------------------------------------------------------
// GET – retrieve the current user's networking profile for an event
// ------------------------------------------------------------
export async function GET({ url, locals }) {
  // Accept event_id as query param e.g. /api/network_profiles?event_id=xxxx
  const eventId = url.searchParams.get('event_id');
  if (!eventId) {
    return json({ error: 'Missing event_id' }, { status: 400 });
  }
  const supabase = locals.supabase;
  const user = locals.user;
  if (!user) {
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

  const metadata = user.user_metadata ?? {};
  const accountName = metadata.full_name ?? metadata.name ?? metadata.display_name ?? user.email?.split('@')[0] ?? profile.display_name;

  return json({
    profile: {
      whoTheyAre: accountName,
      whatTheyDo: profile.what_i_do,
      whoTheyWant: lookingForStr,
      expectations: profile.about_me
    }
  });
}


// ------------------------------------------------------------
// POST – create or update the networking profile for an event
// ------------------------------------------------------------
export async function POST({ request, locals }) {
  const { supabase, user } = locals;
  if (!user) {
    return json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { profile, event_id } = payload ?? {};
  if (typeof event_id !== 'string' || !event_id.trim()) {
    return json({ error: 'event_id is required' }, { status: 400 });
  }
  const whatTheyDo = typeof profile?.whatTheyDo === 'string' ? profile.whatTheyDo.trim() : '';
  const lookingFor = networkingIntent(profile?.whoTheyWant);
  const expectations = typeof profile?.expectations === 'string' ? profile.expectations.trim() : '';
  if (!whatTheyDo || !lookingFor || !expectations) {
    return json({ error: 'All networking profile answers are required.' }, { status: 400 });
  }

  const metadata = user.user_metadata ?? {};
  const whoTheyAre = metadata.full_name ?? metadata.name ?? metadata.display_name ?? user.email?.split('@')[0] ?? 'User';
  const quota = await checkAiQuota(user.id);
  if (!quota.allowed) return json(quota.errorData, { status: 429 });

  let saved = false;
  try {
    const [aboutUserEmbed, lookingForEmbed] = await generateEmbeddings([
      `What I do:\n${whatTheyDo}\n\nAbout me:\n${expectations}`,
      `Looking for:\n${lookingFor}`
    ]);
    const { data, error } = await supabase.from('network_profiles').upsert({
      user_id: user.id,
      event_id,
      display_name: whoTheyAre,
      what_i_do: whatTheyDo,
      looking_for: lookingFor,
      about_me: expectations,
      about_user_embed: aboutUserEmbed,
      looking_for_embed: lookingForEmbed
    }, { onConflict: 'user_id,event_id' }).select();

    if (error || !data?.length) {
      console.error('Network profile write failed:', error?.message);
      return json({ error: 'Could not save your networking profile.' }, { status: 500 });
    }
    saved = true;
    return json({ success: true, profile: data[0] }, { headers: { 'X-AI-Credit-Used': '1' } });
  } catch (err) {
    console.error('Network profile save failed:', err);
    return json({ error: 'Could not generate embeddings or save your networking profile.' }, { status: 500 });
  } finally {
    if (!saved) await refundAiCredit(user.id, quota.reservationKey);
  }
}
