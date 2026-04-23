import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await context.params
    const body = await request.json()
    const { visitorId, visitorName, visitorAvatar } = body

    if (!targetUserId || !visitorId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Don't record self-visit
    if (targetUserId === visitorId) {
      return NextResponse.json({ success: true, ignored: true })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 })
    }

    // Record the notification
    const notificationData = {
      user_id: targetUserId,
      actor_id: visitorId,
      actor_name: visitorName || 'Anonymous',
      actor_avatar: visitorAvatar || null,
      type: 'profile_visit',
      metadata: {}
    }

    // Check if the exact same visit happened very recently to prevent spam (e.g. within 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    // Use Admin client to bypass RLS for notifications
    const adminClient = supabaseAdmin || supabase
    
    if (!adminClient) {
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 })
    }

    const { error: insertError } = await adminClient
      .from('notifications')
      .insert(notificationData)

    if (insertError) {
      console.error('❌ Failed to insert notification:', insertError)
      throw insertError
    }

    // Also record in profile_visits table for permanent data
    const { error: visitError } = await adminClient
      .from('profile_visits')
      .insert({
        target_user_id: targetUserId,
        visitor_id: visitorId,
        visitor_name: visitorName || 'Anonymous',
        visitor_avatar: visitorAvatar || null,
        created_at: new Date().toISOString()
      })

    if (visitError) {
      console.warn('⚠️ Failed to record in profile_visits table:', visitError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Record visit error:', error)
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 })
  }
}
