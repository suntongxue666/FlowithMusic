import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      user_id, 
      anonymous_id, 
      subscription_id, 
      event_type, 
      status, 
      details 
    } = body

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    if (!client) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 })
    }

    const { error } = await client
      .from('payment_logs')
      .insert({
        user_id: user_id || null,
        anonymous_id: anonymous_id || null,
        subscription_id: subscription_id || null,
        event_type,
        status: status || null,
        details: details || {}
      })

    if (error) {
      console.error('❌ Error logging payment event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('❌ Payment log API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
