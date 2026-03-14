import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
    
    // Using supabase select to check if a recent visit from the same actor already exists
    const { data: recentVisits, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('actor_id', visitorId)
      .eq('type', 'profile_visit')
      .gt('created_at', oneHourAgo)
      .limit(1);

    if (recentVisits && recentVisits.length > 0) {
      return NextResponse.json({ success: true, ignored: true, reason: 'rate_limited' })
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationData)

    if (insertError) throw insertError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Record visit error:', error)
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 })
  }
}
