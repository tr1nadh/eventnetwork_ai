import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://jysrdntpypwtdbsqguzv.supabase.co'; // dummy fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.log("No key");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

async function testSearch(q) {
  let query = admin.from('events').select('id, name, description');
  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  
  const { data, error } = await query;
  console.log('Search for', q, '->');
  console.dir(data);
  if (error) console.error(error);
}

testSearch('event');
testSearch('delhi');
