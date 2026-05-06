
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oiggdnnehohoaycyiydn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching letters:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns found in letters table:', Object.keys(data[0]))
  } else {
    console.log('No data found in letters table to check columns.')
  }
}

checkSchema()
