const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('notifications').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Sample Notification Keys:', Object.keys(data[0] || {}))
  }
}

checkSchema()
