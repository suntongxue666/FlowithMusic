const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oiggdnnehohoaycyiydn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU');

async function test() {
  const { data, error } = await supabase.from('letters').select('*').limit(1);
  if (error) console.error("Error:", error);
  else console.log("Columns:", Object.keys(data[0] || {}));
}
test();
