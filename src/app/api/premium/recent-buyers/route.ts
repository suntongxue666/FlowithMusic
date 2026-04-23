import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = supabaseAdmin || supabase
    if (!client) {
      throw new Error('Supabase not initialized')
    }

    // 获取最近点击订阅按钮的10个登录用户
    // 我们从 payment_logs 中查找 event_type 为 PLAN_SELECTED 的记录
    // 并且 user_id 不为空（代表是登录用户）
    const { data: logs, error } = await client
      .from('payment_logs')
      .select(`
        created_at,
        user_id,
        users!inner (
          display_name,
          avatar_url
        )
      `)
      .eq('event_type', 'PLAN_SELECTED')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20) // 取多一点以防去重

    if (error) throw error

    // 简单去重并取前10个
    const uniqueBuyers = []
    const seenUsers = new Set()
    
    for (const log of (logs || [])) {
      if (!seenUsers.has(log.user_id)) {
        seenUsers.add(log.user_id)
        uniqueBuyers.push({
          id: log.user_id,
          name: log.users?.display_name || 'Premium User',
          avatar: log.users?.avatar_url,
          time: log.created_at
        })
      }
      if (uniqueBuyers.length >= 10) break
    }

    return NextResponse.json({
      success: true,
      buyers: uniqueBuyers
    })
  } catch (err: any) {
    console.error('Failed to fetch recent buyers:', err)
    return NextResponse.json({ success: true, buyers: [] })
  }
}
