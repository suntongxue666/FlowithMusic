
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, senderName, recipientType, artistName, linkId } = await request.json()

    if (!targetUserId || !linkId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let title = 'You received a new music letter!'
    let message = `${senderName || 'Someone'} sent you a music letter.`

    if (recipientType === 'random') {
      title = 'A random soul sent you a letter!'
      message = `A random person on FlowithMusic sent you a music letter. Open it to see the surprise!`
    } else if (recipientType === 'soulmate') {
      title = `A fellow fan of ${artistName} sent you a letter!`
      message = `Someone who also loves ${artistName} wanted to share a song with you.`
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'letter_received',
        title: title,
        message: message,
        link_id: linkId,
        is_read: false
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
