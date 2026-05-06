
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, senderName, recipientType, artistName, linkId } = await request.json()

    if (!targetUserId || !linkId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 🚀 核心改动：直接在这里使用管理员 Key 创建客户端，确保绝对权限
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY 

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [Notification API] Missing Service Role Key config')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    let title = 'You received a new music letter!'
    let message = `${senderName || 'Someone'} sent you a music letter.`

    if (recipientType === 'random') {
      title = 'A random soul sent you a letter!'
      message = `A random person on FlowithMusic sent you a music letter. Open it to see the surprise!`
    } else if (recipientType === 'soulmate') {
      title = `A fellow fan of ${artistName} sent you a letter!`
      message = `Someone who also loves ${artistName} wanted to share a song with you.`
    }

    console.log(`📡 [Notification API] Final check - target: ${targetUserId}, type: ${recipientType}`)

    const { data, error } = await adminClient
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'letter_received',
        title: title,
        message: message,
        link_id: linkId,
        is_read: false
      })
      .select()

    if (error) {
      console.error('❌ [Notification API] DB Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [Notification API] Success:', data)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('💥 [Notification API] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
