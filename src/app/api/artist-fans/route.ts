
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const artist = request.nextUrl.searchParams.get('artist')
    const excludeUserId = request.nextUrl.searchParams.get('excludeUserId')

    const { supabaseServer } = await import('@/lib/supabase-server')
    if (!supabaseServer) throw new Error('Supabase server not initialized')

    let fans: any[] = []

    if (artist) {
      console.log(`🔍 Searching fans for artist: ${artist}`)
      // 1. 尝试通过歌手名模糊匹配发过信的用户
      const { data: artistLetters, error } = await supabaseServer
        .from('letters')
        .select('user:users(id, display_name, avatar_url)')
        .ilike('song_artist', `%${artist}%`)
        .not('user_id', 'is', null)
        .limit(20)

      if (artistLetters && !error) {
        // 去重
        const userMap = new Map()
        artistLetters.forEach((item: any) => {
          if (item.user && item.user.id !== excludeUserId) {
            userMap.set(item.user.id, {
              id: item.user.id,
              firstName: item.user.display_name || 'A Music Fan',
              avatarUrl: item.user.avatar_url
            })
          }
        })
        fans = Array.from(userMap.values())
      }
    }

    // 2. 如果没搜到同好，或者搜到的太少，补一些活跃用户
    if (fans.length < 5) {
      console.log('💡 Not enough fans found, adding active users...')
      const { data: activeUsers } = await supabaseServer
        .from('users')
        .select('id, display_name, avatar_url')
        .not('email', 'is', null)
        .limit(10)
      
      if (activeUsers) {
        activeUsers.forEach(user => {
          if (fans.length < 10 && !fans.find(f => f.id === user.id) && user.id !== excludeUserId) {
            fans.push({
              id: user.id,
              firstName: user.display_name || 'A Music Lover',
              avatarUrl: user.avatar_url
            })
          }
        })
      }
    }

    // 打乱顺序增加随机性
    fans.sort(() => Math.random() - 0.5)

    return NextResponse.json({ fans })
  } catch (error: any) {
    console.error('Artist fans fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
