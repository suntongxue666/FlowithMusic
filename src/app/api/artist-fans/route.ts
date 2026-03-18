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

    // 查找发送过该艺术家歌曲的已登录用户
    const { data: letters, error } = await supabase
      .from('letters')
      .select('user_id')
      .eq('song_artist', artist)
      .not('user_id', 'is', null)
      .limit(50)

    if (error || !letters) {
      return NextResponse.json({ fans: [] })
    }

    // 去重 user_id
    const userIds = Array.from(new Set(letters.map((l: any) => l.user_id).filter(Boolean)))

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
