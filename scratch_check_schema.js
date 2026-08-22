import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const vars = {};
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    vars[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = vars.PUBLIC_SUPABASE_URL;
const supabaseKey = vars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error('Error fetching event row:', error);
  } else {
    console.log('Event row:', data);
  }
}
main();
