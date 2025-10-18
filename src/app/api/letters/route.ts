import { NextResponse } from 'next/server'

type DbLetter = {
  id: string
  user_id?: string | null
  anonymous_id?: string | null
  link_id: string
  recipient_name: string
  message: string
  song_id?: string | null
  song_title?: string | null
  song_artist?: string | null
  song_album_cover?: string | null
  song_preview_url?: string | null
  song_spotify_url?: string | null
  created_at: string
  updated_at: string
  view_count: number
  is_public: boolean
  shareable_link?: string | null
  user?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

// 生成唯一的 link_id（与前端逻辑兼容）
function generateLinkId(): string {
  const now = new Date()
  const timeStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomStr = ''
  for (let i = 0; i < 6; i++) randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  return timeStr + randomStr
}

// 构建可分享链接
function buildShareableLink(origin: string, linkId: string): string {
  const base = origin || 'https://www.flowithmusic.com'
  return `${base}/letter/${linkId}`
}

// 输出格式转换
function toCamel(letter: DbLetter) {
  return {
    id: letter.id,
    userId: letter.user_id ?? undefined,
    anonymousId: letter.anonymous_id ?? undefined,
    linkId: letter.link_id,
    recipientName: letter.recipient_name,
    message: letter.message,
    songId: letter.song_id ?? undefined,
    songTitle: letter.song_title ?? undefined,
    songArtist: letter.song_artist ?? undefined,
    songAlbumCover: letter.song_album_cover ?? undefined,
    songPreviewUrl: letter.song_preview_url ?? undefined,
    songSpotifyUrl: letter.song_spotify_url ?? undefined,
    createdAt: letter.created_at,
    updatedAt: letter.updated_at,
    viewCount: letter.view_count,
    isPublic: letter.is_public,
    shareableLink: letter.shareable_link ?? undefined,
    user: letter.user ?? undefined,
  }
}

function toSnake(letter: DbLetter) {
  return {
    id: letter.id,
    user_id: letter.user_id ?? null,
    anonymous_id: letter.anonymous_id ?? null,
    link_id: letter.link_id,
    recipient_name: letter.recipient_name,
    message: letter.message,
    song_id: letter.song_id ?? null,
    song_title: letter.song_title ?? null,
    song_artist: letter.song_artist ?? null,
    song_album_cover: letter.song_album_cover ?? null,
    song_preview_url: letter.song_preview_url ?? null,
    song_spotify_url: letter.song_spotify_url ?? null,
    created_at: letter.created_at,
    updated_at: letter.updated_at,
    view_count: letter.view_count,
    is_public: letter.is_public,
    shareable_link: letter.shareable_link ?? null,
    user: letter.user ?? null,
  }
}

/**
 * GET /api/letters
 * 历史列表（按用户或匿名ID）
 * 支持：
 * - limit: 默认20
 * - page / offset: 分页（page 优先）
 * - userId / anonymousId: 过滤范围（至少传一个，否则返回空列表）
 * - format=camelCase: 返回 { items, limit, offset, hasMore }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const pageParam = searchParams.get('page')
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10)
    const offset = !pageParam ? rawOffset : Math.max((parseInt(pageParam, 10) - 1) * limit, 0)
    const format = searchParams.get('format')
    const userId = searchParams.get('userId') || undefined
    const anonymousId = searchParams.get('anonymousId') || undefined

    if (!userId && !anonymousId) {
      // 为避免泄露全部用户数据，未提供用户标识时返回空
      const empty: DbLetter[] = []
      if (format === 'camelCase') {
        return NextResponse.json({ items: [], limit, offset, hasMore: false })
      }
      return NextResponse.json(empty)
    }

    const { supabaseServer } = await import('@/lib/supabase-server')

    // 组合 where 条件
    let query = supabaseServer
      .from('letters')
      .select(
        `
        *,
        user:users(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId && anonymousId) {
      query = query.or(`user_id.eq.${userId},anonymous_id.eq.${anonymousId}`)
    } else if (userId) {
      query = query.eq('user_id', userId)
    } else if (anonymousId) {
      query = query.eq('anonymous_id', anonymousId)
    }

    const { data, error } = await query
    if (error) {
      console.error('GET /api/letters query error:', error)
      return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 })
    }

    const rows = (data || []) as DbLetter[]

    if (format === 'camelCase') {
      const items = rows.map(toCamel)
      const hasMore = items.length === limit
      return NextResponse.json({ items, limit, offset, hasMore })
    } else {
      return NextResponse.json(rows.map(toSnake))
    }
  } catch (err) {
    console.error('GET /api/letters error:', err)
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 })
  }
}

/**
 * POST /api/letters
 * 创建 Letter，并返回可分享 link：
 * 入参（JSON，camel 或 snake 皆可）：
 * - recipient_name | recipientName
 * - message
 * - song_* 或 songCamelCase（任选）
 * - user_id | userId（可选）
 * - anonymous_id | anonymousId（可选）
 * - is_public | isPublic（默认 true）
 * 输出：
 * - 默认 snake_case；format=camelCase 返回驼峰
 * - 包含 link_id 与 shareable_link
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get('format')
    const origin = url.origin

    const body = await request.json()

    // 兼容两种命名
    const payload = {
      user_id: body.user_id ?? body.userId ?? null,
      anonymous_id: body.anonymous_id ?? body.anonymousId ?? null,
      recipient_name: body.recipient_name ?? body.recipientName,
      message: body.message,
      // 兼容 flat 与 nested song
      song_id: body.song_id ?? body.songId ?? body.song?.id ?? null,
      song_title: body.song_title ?? body.songTitle ?? body.song?.title ?? '',
      song_artist: body.song_artist ?? body.songArtist ?? body.song?.artist ?? '',
      song_album_cover: body.song_album_cover ?? body.songAlbumCover ?? body.song?.albumCover ?? '',
      song_preview_url: body.song_preview_url ?? body.songPreviewUrl ?? body.song?.previewUrl ?? '',
      song_spotify_url: body.song_spotify_url ?? body.songSpotifyUrl ?? body.song?.spotifyUrl ?? '',
      is_public:
        typeof body.is_public === 'boolean'
          ? body.is_public
          : typeof body.isPublic === 'boolean'
          ? body.isPublic
          : true,
    }

    // 基础校验
    if (!payload.recipient_name || !payload.message) {
      return NextResponse.json({ error: 'recipient_name and message are required' }, { status: 400 })
    }

    const link_id = generateLinkId()
    const nowIso = new Date().toISOString()

    const insertData = {
      user_id: payload.user_id,
      anonymous_id: payload.anonymous_id,
      link_id,
      recipient_name: payload.recipient_name,
      message: payload.message,
      song_id: payload.song_id,
      song_title: payload.song_title,
      song_artist: payload.song_artist,
      song_album_cover: payload.song_album_cover,
      song_preview_url: payload.song_preview_url,
      song_spotify_url: payload.song_spotify_url,
      view_count: 0,
      is_public: payload.is_public,
      created_at: nowIso,
      updated_at: nowIso,
      // shareable_link 字段若存在于表，先留空，插入后用应用层返回
    }

    const { supabaseServer } = await import('@/lib/supabase-server')
    const { data, error } = await supabaseServer
      .from('letters')
      .insert(insertData)
      .select(
        `
        *,
        user:users(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single()

    if (error || !data) {
      console.error('POST /api/letters insert error:', error)
      return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 })
    }

    const created = data as DbLetter
    const shareable = buildShareableLink(origin, created.link_id)
    const withShare: DbLetter = { ...created, shareable_link: shareable }

    if (format === 'camelCase') {
      return NextResponse.json(toCamel(withShare))
    } else {
      return NextResponse.json(toSnake(withShare))
    }
  } catch (err) {
    console.error('POST /api/letters error:', err)
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 })
  }
}