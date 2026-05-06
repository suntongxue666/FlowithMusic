
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const artist = request.nextUrl.searchParams.get('artist')
    const excludeUserId = request.nextUrl.searchParams.get('excludeUserId')

    console.log(`📡 [API/artist-fans] Searching for artist: "${artist}"`)

    const { supabaseServer } = await import('@/lib/supabase-server')
    if (!supabaseServer) throw new Error('Supabase server not initialized')

    let fans: any[] = []

    // 1. 尝试寻找真正的同好
    if (artist) {
      const { data: artistLetters, error } = await supabaseServer
        .from('letters')
        .select(`
          user_id,
          song_artist,
          users!user_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .ilike('song_artist', `%${artist}%`)
        .not('user_id', 'is', null)
        .limit(30)

      if (error) {
        console.error('❌ [API/artist-fans] DB Error:', error)
      } else if (artistLetters) {
        console.log(`✅ [API/artist-fans] Found ${artistLetters.length} raw letter matches`)
        const userMap = new Map()
        artistLetters.forEach((item: any) => {
          const u = item.users
          if (u && u.id !== excludeUserId) {
            userMap.set(u.id, {
              id: u.id,
              firstName: u.display_name || 'A Music Fan',
              avatarUrl: u.avatar_url
            })
          }
        })
        fans = Array.from(userMap.values())
      }
    }

    console.log(`✅ [API/artist-fans] Filtered fans count: ${fans.length}`)

    // 2. 保底逻辑：如果同好太少（少于 6 个），强制补齐活跃用户
    if (fans.length < 6) {
      console.log('💡 [API/artist-fans] Supplementing with active users...')
      const { data: activeUsers } = await supabaseServer
        .from('users')
        .select('id, display_name, avatar_url')
        .not('email', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(15)
      
      if (activeUsers) {
        activeUsers.forEach(user => {
          if (fans.length < 12 && !fans.find(f => f.id === user.id) && user.id !== excludeUserId) {
            fans.push({
              id: user.id,
              firstName: user.display_name || 'A Music Lover',
              avatarUrl: user.avatar_url
            })
          }
        })
      }
    }

    // 打乱顺序，让每次看都不太一样
    fans.sort(() => Math.random() - 0.5)

    console.log(`🚀 [API/artist-fans] Returning ${fans.length} total fans`)
    return NextResponse.json({ fans })
  } catch (error: any) {
    console.error('💥 [API/artist-fans] Fatal Error:', error)
    return NextResponse.json({ error: error.message, fans: [] }, { status: 500 })
  }
}
