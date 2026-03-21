const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oiggdnnehohoaycyiydn.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'no-key');
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? "HAS KEY" : "NO KEY");
