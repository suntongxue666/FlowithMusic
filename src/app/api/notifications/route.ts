import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const countOnly = searchParams.get('countOnly') === 'true'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const adminClient = supabaseAdmin || supabase
    if (!adminClient) {
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 })
    }

    if (countOnly) {
      const { count, error } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return NextResponse.json({ count: count || 0 })
    }

    const { data, error } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ notifications: data })
  } catch (error: any) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, userId, markAll } = body

    if (!userId && !notificationId) {
      return NextResponse.json({ error: 'User ID or Notification ID is required' }, { status: 400 })
    }

    const adminClient = supabaseAdmin || supabase
    if (!adminClient) {
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 })
    }

    if (markAll && userId) {
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
      if (error) throw error
    } else if (notificationId) {
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
