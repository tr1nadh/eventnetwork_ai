import { json } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { createChatCompletion } from '$lib/llm/fireworks';
import { generateEmbedding } from '$lib/embeddings';

/**
 * POST /api/dummy_users
 * Creates 5 dummy participants for the given event with realistic, diverse
 * networking profiles that are intentionally relevant to the current user's
 * profile so meaningful AI matches can be produced.
 *
 * Flow:
 *  1. Clean up any previous dummy users for this event.
 *  2. Fetch the current user's network profile for context.
 *  3. For each of 5 dummy users:
 *     a. Create auth account via admin API.
 *     b. Create a `users` row.
 *     c. Join the event (insert into `participants`).
 *     d. Generate a realistic profile using Fireworks LLM.
 *     e. Generate embeddings for `about_user` and `looking_for`.
 *     f. Insert `network_profiles` row.
 *  4. Return the created profiles.
 */
export async function POST({ request, locals }) {
  const { event_id } = await request.json();
  if (!event_id) return json({ error: 'event_id required' }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // ── 0. Fetch current user's profile for context ──────────────────────
  let userContext = '';
  if (locals?.user?.id) {
    const { data: myProfile } = await supabase
      .from('network_profiles')
      .select('display_name, what_i_do, looking_for, about_me')
      .eq('user_id', locals.user.id)
      .eq('event_id', event_id)
      .single();

    if (myProfile) {
      userContext = `
The current user's networking profile (create profiles relevant to this person):
- Display Name: ${myProfile.display_name}
- What they do: ${myProfile.what_i_do}
- Looking for: ${myProfile.looking_for}
- About them: ${myProfile.about_me}
`.trim();
    }
  }

  // ── 1. Clean up previous dummy users for this event ──────────────────
  const dummyEmailPattern = `dummy%+${event_id}@eventnetwork.ai`;
  const { data: existingDummies } = await supabase
    .from('network_profiles')
    .select('user_id')
    .eq('event_id', event_id)
    .filter('user_id', 'in', `(SELECT id FROM auth.users WHERE email ILIKE '${dummyEmailPattern}')`);

  // Clean up by querying users table for matching dummy emails
  const { data: existingUsers } = await supabase
    .rpc('get_dummy_user_ids', { pattern: dummyEmailPattern })
    .select('id');

  // Fallback: look up dummy users by email in auth
  const dummyIds = [];
  
  // We cannot trust listUsers to filter properly, so fetch all and filter manually
  const { data: list } = await supabase.auth.admin.listUsers();
  const allUsers = list?.users ?? [];
  
  for (let i = 1; i <= 10; i++) {
    const email = `dummy${i}+${event_id}@eventnetwork.ai`;
    const foundUser = allUsers.find(u => u.email === email);
    if (foundUser) {
      dummyIds.push(foundUser.id);
    }
  }

  // Delete associated data, then auth users
  if (dummyIds.length > 0) {
    await supabase.from('network_profiles').delete().in('user_id', dummyIds);
    await supabase.from('event_participants').delete().in('user_id', dummyIds);
    for (const id of dummyIds) {
      await supabase.auth.admin.deleteUser(id);
    }
  }

  // ── 2. Generate 5 diverse profiles via LLM in one call ───────────────
  const systemPrompt = `You are a profile generator for a tech networking event. Generate exactly 5 fictional attendee profiles.

Each profile must have these fields:
- "display_name": A realistic full name (diverse backgrounds)
- "what_i_do": A 1-2 sentence description of their role/work (varied: engineer, designer, founder, marketer, researcher, etc.)
- "looking_for": Who they want to meet and why (1-2 sentences)
- "about_me": A genuine 2-3 sentence bio that sounds natural

IMPORTANT GUIDELINES:
- Make profiles varied in role, industry, experience level, and goals
- Profile 1 & 2: Strong matches (highly complementary to the user)
- Profile 3: Moderate match (some overlap but different focus)
- Profile 4: Complementary skills match (different domain but useful connection)
- Profile 5: Serendipity match (unexpected but potentially valuable connection)
- Each profile must be distinctly different — no duplicates or near-duplicates
- Use realistic, diverse names from different backgrounds
- DO NOT truncate the output. You MUST write out all 5 profiles completely. Do not use "..." or skip any fields.

Respond ONLY with a valid JSON object containing a single key "profiles" which is an array of exactly 5 profile objects. Do not output any markdown formatting or explanations.`;

  const userPrompt = userContext
    ? `${userContext}\n\nGenerate 5 diverse dummy networking profiles relevant to this user.`
    : 'Generate 5 diverse dummy networking profiles for a tech event.';

  let profiles;
  try {
    const llmRes = await createChatCompletion({
      model: 'accounts/fireworks/models/qwen3p7-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      reasoning_effort: 'none',
      response_format: { type: 'json_object' }
    });

    let content = llmRes.choices?.[0]?.message?.content ?? '';

    // Extract the JSON block from markdown
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    // If no markdown block, fallback to finding the first { or [
    const objStart = jsonStr.indexOf('{');
    const arrStart = jsonStr.indexOf('[');
    
    let startIdx = -1;
    let isArray = false;

    if (objStart !== -1 && arrStart !== -1) {
      startIdx = Math.min(objStart, arrStart);
      isArray = arrStart < objStart;
    } else if (objStart !== -1) {
      startIdx = objStart;
    } else if (arrStart !== -1) {
      startIdx = arrStart;
      isArray = true;
    }

    if (startIdx === -1) {
      throw new Error(`LLM response did not contain a JSON object or array. Raw content: ${content}`);
    }

    jsonStr = jsonStr.substring(startIdx);
    let parsed = false;
    let endChar = isArray ? ']' : '}';
    let endIdx = jsonStr.lastIndexOf(endChar);
    
    while (endIdx !== -1) {
      try {
        const attempt = jsonStr.substring(0, endIdx + 1);
        const data = JSON.parse(attempt);
        
        if (Array.isArray(data)) {
          profiles = data;
          parsed = true;
          break;
        } else if (data.profiles && Array.isArray(data.profiles)) {
          profiles = data.profiles;
          parsed = true;
          break;
        }
      } catch (e) {
        // Not valid JSON, try the next bracket backwards
      }
      endIdx = jsonStr.lastIndexOf(endChar, endIdx - 1);
    }

    if (!parsed || profiles.length < 1) {
      throw new Error(`LLM did not return a valid array of profiles. Raw content: ${content}`);
    }
  } catch (err) {
    console.error('LLM profile generation failed:', err);
    return json({ error: 'Failed to generate profiles: ' + err.message }, { status: 502 });
  }

  // ── 3. Create each dummy user ────────────────────────────────────────
  const createdProfiles = [];
  const errors = [];

  for (let i = 0; i < Math.min(profiles.length, 5); i++) {
    const profile = profiles[i];
    const email = `dummy${i + 1}+${event_id}@eventnetwork.ai`;

    try {
      // 3a. Create auth account
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { display_name: profile.display_name },
      });

      if (authErr) throw new Error(`Auth: ${authErr.message}`);
      const userId = authData.user.id;

      // 3b. Join event
      const { error: partErr } = await supabase.from('event_participants').insert({
        event_id: event_id,
        user_id: userId,
        status: 'joined',
        joined_at: new Date().toISOString(),
      });
      if (partErr) {
        console.warn(`Participant insert warning for dummy ${i + 1}:`, partErr);
      } 
      
      // 3c. Generate embeddings (parallel)
      const aboutUserText = `What I do: ${profile.what_i_do}\n\nAbout me: ${profile.about_me}`;
      const lookingForText = `Looking for: ${profile.looking_for}`;

      const [aboutUserEmbed, lookingForEmbed] = await Promise.all([
        generateEmbedding(aboutUserText),
        generateEmbedding(lookingForText),
      ]);

      // 3d. Insert network profile
      const { error: profileErr } = await supabase.from('network_profiles').insert({
        user_id: userId,
        event_id,
        display_name: profile.display_name,
        what_i_do: profile.what_i_do,
        looking_for: profile.looking_for,
        about_me: profile.about_me,
        about_user_embed: aboutUserEmbed,
        looking_for_embed: lookingForEmbed,
      });
      if (profileErr) throw new Error(`Profile insert: ${profileErr.message}`);

      createdProfiles.push({
        displayName: profile.display_name,
        whatTheyDo: profile.what_i_do,
        lookingFor: profile.looking_for,
        aboutMe: profile.about_me,
      });
    } catch (err) {
      console.error(`Error creating dummy user ${i + 1}:`, err);
      errors.push(`Dummy ${i + 1}: ${err.message}`);
    }
  }

  if (createdProfiles.length === 0) {
    return json(
      { error: 'Failed to create any dummy users', details: errors },
      { status: 500 }
    );
  }

  return json({
    message: `${createdProfiles.length} dummy users created`,
    profiles: createdProfiles,
    ...(errors.length ? { warnings: errors } : {}),
  });
}
