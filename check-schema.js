const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://oiggdnnehohoaycyiydn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name')
    .limit(1);

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Sample User:', data[0]);
  }
}

checkUsers();
