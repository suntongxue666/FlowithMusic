const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check(id) {
  console.log(`Checking for subscription ID: ${id}...`);
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, metadata, is_premium, premium_until')
    .contains('metadata', { last_subscription_id: id });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Found user:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No user found with this subscription ID in metadata.');
    
    // Check all users just in case
    console.log('Checking if any user has this ID in their metadata strings...');
    const { data: allUsers } = await supabase.from('users').select('id, metadata');
    const matched = allUsers?.filter(u => JSON.stringify(u.metadata).includes(id));
    if (matched && matched.length > 0) {
       console.log('Found user via string match:', matched);
    } else {
       console.log('Still nothing.');
    }
  }
}

const id = process.argv[2] || 'I-S1U3NY4X36D2';
check(id);
