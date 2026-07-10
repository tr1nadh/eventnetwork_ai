import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  const slug = (body?.id?.trim() || (name ? slugify(name) : '')).toLowerCase();

  if (!name || !slug) {
    throw error(400, 'Name and ID are required.');
  }

  const admin = createSupabaseAdminClient();

  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    throw error(500, lookupError.message);
  }

  if (existingEvent) {
    throw error(409, 'That ID is already in use. Please choose another one.');
  }

  const { data, error: insertError } = await admin
    .from('events')
    .insert({
      name,
      description,
      slug,
      created_by: locals.user.id
    })
    .select('id, name, description, slug, created_by, created_at, updated_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw error(409, 'That ID is already in use. Please choose another one.');
    }

    throw error(400, insertError.message);
  }

  return json({ event: data }, { status: 201 });
}
