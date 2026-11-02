import { error, json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { generateEmbedding } from '$lib/embeddings';

export async function POST({ params, request, cookies }) {
  const { event_id } = await request.json().catch(() => ({}));
  if (!event_id) throw error(400, 'event_id is required.');
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated.');

  const { data: card, error: cardError } = await supabase.from('network_cards').select('id, title, display_name, what_i_do, looking_for, about_me, is_archived').eq('id', params.id).eq('user_id', user.id).maybeSingle();
  if (cardError) throw error(500, cardError.message);
  if (!card || card.is_archived) throw error(404, 'Network card not found.');

  const [about_user_embed, looking_for_embed] = await Promise.all([
    generateEmbedding(`What I do:\n${card.what_i_do}${card.about_me ? `\n\nAbout me:\n${card.about_me}` : ''}`),
    generateEmbedding(`Looking for:\n${card.looking_for}`)
  ]);

  const { data: profile, error: saveError } = await supabase.from('network_profiles').upsert({
    user_id: user.id,
    event_id,
    network_card_id: card.id,
    display_name: card.display_name,
    what_i_do: card.what_i_do,
    looking_for: card.looking_for,
    about_me: card.about_me,
    about_user_embed,
    looking_for_embed,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,event_id' }).select('network_card_id, display_name, what_i_do, looking_for, about_me').single();
  if (saveError) throw error(500, saveError.message);
  return json({ profile, card });
}
