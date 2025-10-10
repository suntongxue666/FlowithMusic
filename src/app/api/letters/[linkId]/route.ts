import { NextRequest, NextResponse } from 'next/server'

// 输出 camelCase（App 友好）
function toCamel(letter: any) {
  if (!letter || typeof letter !== 'object') return letter
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
    user: letter.user
      ? {
          id: letter.user.id,
          display_name: letter.user.display_name,
          avatar_url: letter.user.avatar_url,
        }
      : letter.user,
  }
}

function maybeFormatCamel(data: any, format: string | null) {
  return format === 'camelCase' ? toCamel(data) : data
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
              avatar_url
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
              avatar_url
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