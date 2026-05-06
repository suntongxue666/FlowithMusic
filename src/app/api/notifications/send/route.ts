
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, senderName, recipientType, artistName, linkId } = await request.json()

    if (!targetUserId || !linkId) {
      console.error('❌ [Notification API] Missing required fields:', { targetUserId, linkId })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 使用 Admin 权限绕过 RLS
    const { supabaseServer } = await import('@/lib/supabase-server')
    if (!supabaseServer) throw new Error('Supabase admin client not found')

    let title = 'You received a new music letter!'
    let message = `${senderName || 'Someone'} sent you a music letter.`

    if (recipientType === 'random') {
      title = 'A random soul sent you a letter!'
      message = `A random person on FlowithMusic sent you a music letter. Open it to see the surprise!`
    } else if (recipientType === 'soulmate') {
      title = `A fellow fan of ${artistName} sent you a letter!`
      message = `Someone who also loves ${artistName} wanted to share a song with you.`
    }

    console.log(`📡 [Notification API] Sending ${recipientType} notification to user: ${targetUserId}`)

    const { error } = await supabaseServer
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'letter_received',
        title: title,
        message: message,
        link_id: linkId,
        is_read: false
      })

    if (error) {
      console.error('❌ [Notification API] DB Insert Error:', error)
      throw error
    }

    console.log('✅ [Notification API] Notification sent successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('💥 [Notification API] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
