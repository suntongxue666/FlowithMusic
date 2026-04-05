import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 动物表情符号数组（与前端保持一致）
const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']

// 浅色背景数组（与前端保持一致）
const LIGHT_COLORS = [
  '#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF5E5', '#F0E5FF', '#E5FFFF',
  '#FFE5F5', '#F5FFE5', '#E5E5FF', '#FFFFE5', '#FFE5CC', '#E5FFCC',
  '#CCE5FF', '#FFCCE5', '#E5CCFF', '#CCFFE5', '#FFCCCC', '#CCFFCC',
  '#CCCCFF', '#FFFFCC', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#FFFFE0'
]

// 生成匿名用户头像和用户名 - 基于统一的匿名ID
function generateAnonymousUser(letter: any) {
  // 优先使用letter的anonymous_id，如果没有则使用linkId（兼容旧数据）
  const seedId = letter.anonymous_id || letter.link_id || 'fallback'

  // 使用anonymous_id作为种子来确保同一个匿名用户的所有letter显示相同的头像和用户名
  let hash = 0
  for (let i = 0; i < seedId.length; i++) {
    const char = seedId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  const emojiIndex = Math.abs(hash) % ANIMAL_EMOJIS.length
  const colorIndex = Math.abs(hash >> 8) % LIGHT_COLORS.length
  const userNumber = Math.abs(hash >> 16) % 100000000 // 8位数字

  return {
    emoji: ANIMAL_EMOJIS[emojiIndex],
    backgroundColor: LIGHT_COLORS[colorIndex],
    username: `Guest${userNumber.toString().padStart(8, '0')}`
  }
}

// 获取统一的作者资料给 App 端和 Web 端使用
function getAuthorProfile(letter: any) {
  if (letter.user) {
    return {
      type: 'registered',
      id: letter.user.id,
      name: letter.user.display_name || 'Anonymous',
      avatarUrl: letter.user.avatar_url || null,
      avatarInitials: (letter.user.display_name?.charAt(0) || letter.user.email?.charAt(0) || 'U').toUpperCase(),
    }
  } else {
    const anonymousUser = generateAnonymousUser(letter)
    return {
      type: 'anonymous',
      id: letter.anonymous_id || letter.link_id || 'fallback',
      name: anonymousUser.username,
      avatarUrl: null,
      avatarEmoji: anonymousUser.emoji,
      avatarBackgroundColor: anonymousUser.backgroundColor,
    }
  }
}


// 输出 camelCase（App 友好）
function toCamel(letter: any) {
  if (!letter || typeof letter !== 'object') return letter
  const anonymousUserInfo = generateAnonymousUser(letter) // 保证总是有返回值
  const authorProfile = getAuthorProfile(letter)
  return {
    id: letter.id,
    userId: letter.user_id,
    anonymousId: letter.anonymous_id,
    linkId: letter.link_id,
    recipientName: letter.recipient_name,
    message: letter.message,
    songId: letter.song_id,
    songTitle: letter.song_title,
    songArtist: letter.song_artist,
    songAlbumCover: letter.song_album_cover,
    songPreviewUrl: letter.song_preview_url,
    songSpotifyUrl: letter.song_spotify_url,
    createdAt: letter.created_at,
    updatedAt: letter.updated_at,
    viewCount: letter.view_count,
    isPublic: letter.is_public,
    shareableLink: letter.shareable_link,
    anonymousUserInfo: anonymousUserInfo,
    authorProfile: authorProfile,
    user: letter.user
      ? {
        id: letter.user.id,
        display_name: letter.user.display_name,
        avatar_url: letter.user.avatar_url,
        is_premium: letter.user.is_premium,
      }
      : letter.user,
  }
}

function maybeFormatCamel(data: any, format: string | null) {
  if (format === 'camelCase') {
    return toCamel(data)
  }
  
  // 对于默认的 snake_case 响应，我们也注入 author_profile 以供非 camelCase 客户端使用
  if (data && typeof data === 'object') {
    data.author_profile = getAuthorProfile(data)
  }
  return data
}

// 全局存储 - 在生产环境中应该使用 Redis 或数据库
const globalLetterStorage = new Map<string, any>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    console.log('🔍 API: Searching for letter:', linkId)
    const format = request.nextUrl.searchParams.get('format')

    // 1. 首先尝试从Supabase获取
    try {
      const { supabaseServer } = await import('@/lib/supabase-server')
      if (supabaseServer) {
        console.log('📡 Trying Supabase for:', linkId)
        const { data, error } = await supabaseServer
          .from('letters')
          .select(`
            *,
            user:users(
              id,
              display_name,
              avatar_url,
              is_premium
            )
          `)
          .eq('link_id', linkId)
          .eq('is_public', true) // 确保只获取公开的Letters
          .single()

        if (!error && data) {
          console.log('✅ Found in Supabase:', linkId)
          const formatted = maybeFormatCamel(data, format)
          return NextResponse.json(formatted)
        } else {
          console.log('❌ Supabase error:', error?.message)
        }
      } else {
        console.log('❌ Supabase server client not initialized')
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase connection failed:', supabaseError)
    }

    // 2. 尝试从全局存储获取
    if (globalLetterStorage.has(linkId)) {
      const letter = globalLetterStorage.get(linkId)
      console.log('✅ Found in global storage:', linkId)
      const formatted = maybeFormatCamel(letter, format)
      return NextResponse.json(formatted)
    }

    // 3. 尝试从浏览器存储API获取
    try {
      const browserStorageResponse = await fetch(`${request.nextUrl.origin}/api/browser-storage/${linkId}`)
      if (browserStorageResponse.ok) {
        const data = await browserStorageResponse.json()
        console.log('✅ Found in browser storage:', linkId)

        // 缓存到全局存储
        globalLetterStorage.set(linkId, data)
        const formatted = maybeFormatCamel(data, format)
        return NextResponse.json(formatted)
      }
    } catch (browserError) {
      console.warn('⚠️ Browser storage fetch failed:', browserError)
    }

    // 4. 最后的尝试：检查是否有临时数据
    console.log('❌ Letter not found anywhere:', linkId)
    console.log('📊 Global storage keys:', Array.from(globalLetterStorage.keys()))

    return NextResponse.json(
      {
        error: 'Letter not found',
        message: 'This letter is not available. It may have been deleted or the link is incorrect.',
        linkId,
        debug: {
          globalStorageSize: globalLetterStorage.size,
          availableKeys: Array.from(globalLetterStorage.keys()).slice(0, 5)
        }
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('💥 API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const letterData = await request.json()

    console.log('💾 API: Saving letter:', linkId)

    // 确保Letter是公开的
    const letter = {
      ...letterData,
      link_id: linkId,
      is_public: true,
      created_at: letterData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 1. 尝试保存到Supabase
    try {
      const { supabaseServer } = await import('@/lib/supabase-server')
      if (supabaseServer) {
        console.log('📡 Saving to Supabase:', linkId)
        const { data, error } = await supabaseServer
          .from('letters')
          .insert(letter)
          .select(`
            *,
            user:users(
              id,
              display_name,
              avatar_url,
              is_premium
            )
          `)
          .single()

        if (!error && data) {
          console.log('✅ Saved to Supabase:', linkId)
          // 同时保存到全局存储作为备份
          globalLetterStorage.set(linkId, data)
          return NextResponse.json(data)
        } else {
          console.log('❌ Supabase save error:', error?.message)
        }
      } else {
        console.log('❌ Supabase server client not initialized')
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase save failed:', supabaseError)
    }

    // 2. 保存到全局存储作为fallback
    globalLetterStorage.set(linkId, letter)
    console.log('✅ Saved to global storage:', linkId)

    // 3. 尝试保存到浏览器存储
    try {
      const browserStorageResponse = await fetch(`${request.nextUrl.origin}/api/browser-storage/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letter)
      })

      if (browserStorageResponse.ok) {
        console.log('✅ Also saved to browser storage:', linkId)
      }
    } catch (browserError) {
      console.warn('⚠️ Browser storage save failed:', browserError)
    }

    return NextResponse.json({
      ...letter,
      fallback: true,
      message: 'Letter saved successfully'
    })
  } catch (error) {
    console.error('💥 Save error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save letter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 调试端点
export async function PUT(request: NextRequest) {
  try {
    // 返回全局存储状态
    const letters = Array.from(globalLetterStorage.entries()).map(([linkId, letter]) => ({
      linkId,
      recipient: letter.recipient_name,
      created: letter.created_at,
      public: letter.is_public
    }))

    return NextResponse.json({
      globalStorageSize: globalLetterStorage.size,
      letters
    })
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}

// 新增：调试所有Letters的端点
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params

    console.log('🔍 DEBUGGING LETTER ACCESS for linkId:', linkId)

    const debugInfo: any = {
      linkId,
      timestamp: new Date().toISOString(),
      checks: {}
    }

    // 1. 检查全局存储
    debugInfo.checks.globalStorage = {
      exists: globalLetterStorage.has(linkId),
      total: globalLetterStorage.size,
      allKeys: Array.from(globalLetterStorage.keys())
    }

    // 2. 检查Supabase
    try {
      const { supabaseServer } = await import('@/lib/supabase-server')
      if (supabaseServer) {
        const { data, error } = await supabaseServer
          .from('letters')
          .select('link_id, is_public, created_at, recipient_name')
          .eq('link_id', linkId)
          .single()

        debugInfo.checks.supabase = {
          found: !error && !!data,
          error: error?.message,
          data: data || null
        }
      } else {
        debugInfo.checks.supabase = { error: 'Supabase server client not initialized' }
      }
    } catch (supabaseError) {
      debugInfo.checks.supabase = {
        error: `Connection failed: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}`
      }
    }

    // 3. 检查browser storage API
    try {
      const browserResponse = await fetch(`${request.nextUrl.origin}/api/browser-storage/${linkId}`)
      debugInfo.checks.browserStorage = {
        status: browserResponse.status,
        found: browserResponse.ok
      }
      if (browserResponse.ok) {
        const browserData = await browserResponse.json()
        debugInfo.checks.browserStorage.data = browserData
      }
    } catch (browserError) {
      debugInfo.checks.browserStorage = {
        error: browserError instanceof Error ? browserError.message : 'Unknown error'
      }
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}