
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetUserId, senderName, senderId, senderAvatar, recipientType, artistName, linkId } = body

    console.log('📬 [Notification API] Received Request:', {
      targetUserId,
      senderName,
      linkId
    })

    if (!targetUserId || !linkId) {
      return NextResponse.json({ error: 'Missing targetUserId or linkId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY 

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server Environment Error' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // 🚀 核心适配：使用数据库真实字段名
    // 根据 recipientType 构造元数据
    const metadata = {
      artistName: artistName,
      recipientType: recipientType,
      isMusicSoulmate: recipientType === 'soulmate'
    }

    const insertPayload = {
      user_id: targetUserId,
      actor_id: senderId || 'anonymous',
      actor_name: senderName || 'Someone',
      actor_avatar: senderAvatar || null,
      type: 'soulmate_letter', // 升级为专门的同好信件通知类型
      letter_id: linkId,
      metadata: metadata,
      is_read: false
    }

    console.log('📡 [Notification API] Inserting with correct schema:', insertPayload)

    const { data, error } = await adminClient
      .from('notifications')
      .insert(insertPayload)
      .select()

    if (error) {
      console.error('❌ [Notification API] Insert Failed:', error)
      return NextResponse.json({ 
        error: 'Database rejection', 
        details: error 
      }, { status: 500 })
    }

    console.log('✅ [Notification API] Success:', data)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('💥 [Notification API] Fatal Catch:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
