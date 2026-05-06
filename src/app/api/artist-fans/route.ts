import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/artist-fans?artist=Disclosure&excludeUserId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const artist = searchParams.get('artist')
    const excludeUserId = searchParams.get('excludeUserId') || ''

    if (!artist) {
      return NextResponse.json({ fans: [] })
    }

    if (!supabase) {
      return NextResponse.json({ fans: [] })
    }

    // 查找发送过该艺术家歌曲的已登录用户 - 使用模糊匹配以处理多位歌手的情况
    const { data: letters, error } = await supabase
      .from('letters')
      .select('user_id')
      .ilike('song_artist', `%${artist}%`)
      .not('user_id', 'is', null)
      .limit(100)

    let userIds: string[] = []
    
    if (letters && letters.length > 0) {
      // 去重 user_id
      userIds = Array.from(new Set(letters.map((l: any) => l.user_id).filter(Boolean)))
    }

    // 🔴 兜底方案：如果没找到该歌手的同好，随机取几个活跃用户
    if (userIds.length === 0) {
      console.log('No fans found for artist, using random active users as fallback')
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id')
        .not('email', 'is', null)
        .limit(10)
      
      if (activeUsers) {
        userIds = activeUsers.map(u => u.id)
      }
    }

    if (userIds.length === 0) {
      return NextResponse.json({ fans: [] })
    }

    // 过滤掉当前Letter的发送者
    const filteredIds = excludeUserId
      ? userIds.filter(id => id !== excludeUserId)
      : userIds

    if (filteredIds.length === 0) {
      return NextResponse.json({ fans: [] })
    }

    // 获取用户信息
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', filteredIds.slice(0, 20)) // 最多20人

    if (userError || !users) {
      return NextResponse.json({ fans: [] })
    }

    const fans = users.map((u: any) => ({
      id: u.id,
      firstName: (u.display_name || 'User').trim().split(/\s+/)[0],
      avatarUrl: u.avatar_url || null,
    }))

    return NextResponse.json({ fans })
  } catch (error) {
    console.error('Error fetching artist fans:', error)
    return NextResponse.json({ fans: [] })
  }
}
