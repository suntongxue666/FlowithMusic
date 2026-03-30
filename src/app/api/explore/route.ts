import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']
const LIGHT_COLORS = ['#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF5E5', '#F0E5FF', '#E5FFFF', '#FFE5F5', '#F5FFE5', '#E5E5FF', '#FFFFE5', '#FFE5CC', '#E5FFCC', '#CCE5FF', '#FFCCE5', '#E5CCFF', '#CCFFE5', '#FFCCCC', '#CCFFCC', '#CCCCFF', '#FFFFCC', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#FFFFE0']

function generateAnonymousUser(letter: any) {
  const seedId = letter.anonymous_id || letter.link_id || 'fallback'
  let hash = 0
  for (let i = 0; i < seedId.length; i++) {
    const char = seedId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const emojiIndex = Math.abs(hash) % ANIMAL_EMOJIS.length
  const colorIndex = Math.abs(hash >> 8) % LIGHT_COLORS.length
  const userNumber = Math.abs(hash >> 16) % 100000000
  return {
    emoji: ANIMAL_EMOJIS[emojiIndex],
    backgroundColor: LIGHT_COLORS[colorIndex],
    username: `Guest${userNumber.toString().padStart(8, '0')}`
  }
}

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


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // 基本分页参数
    const limit = parseInt(searchParams.get('limit') || '18', 10)

    // 兼容 page 与 offset：若未显式传 offset，则由 page 换算
    const pageParam = searchParams.get('page')
    const offsetParam = searchParams.get('offset')
    let offset = 0
    if (offsetParam !== null) {
      offset = parseInt(offsetParam || '0', 10)
    } else if (pageParam !== null) {
      const page = Math.max(parseInt(pageParam || '1', 10), 1)
      offset = (page - 1) * limit
    }

    // 兼容 q 与 searchQuery
    const rawQuery = searchParams.get('searchQuery') ?? searchParams.get('q') ?? ''
    const searchQuery = rawQuery.trim()

    const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'view_count'
    const category = searchParams.get('category') || undefined
    const format = searchParams.get('format') // camelCase 或默认
    const includePrivate = searchParams.get('includePrivate') === 'true'

    let fetchedLetters: Letter[] = []

    if (searchQuery) {
      fetchedLetters = await letterService.searchLetters(searchQuery, limit, offset, includePrivate)
    } else {
      fetchedLetters = await letterService.getPublicLetters(limit, offset, sortBy, { category, includePrivate })
    }

    console.log(`🌐 API Explore: Fetched ${fetchedLetters.length} letters. Query: "${searchQuery}"`)

    // 批量获取有 user_id 的用户信息，附加到 letter.user
    const userIds = Array.from(new Set(
      fetchedLetters.map(l => l.user_id).filter(Boolean)
    ))

    const userMap: Record<string, { id: string; display_name: string; avatar_url: string | null }> = {}

    if (userIds.length > 0 && supabase) {
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (users) {
        users.forEach((u: any) => { userMap[u.id] = u })
      }
    }

    // 将用户信息附加到 letter
    const enrichedLetters = fetchedLetters.map(l => ({
      ...l,
      user: l.user_id ? (userMap[l.user_id] || null) : null,
    }))

    const filteredLetters = enrichedLetters

    if (format === 'camelCase') {
      const items = filteredLetters.map(letter => ({
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
        user: (letter as any).user,
        authorProfile: getAuthorProfile(letter),
      }))

      const hasMore = items.length === limit

      return NextResponse.json({
        items,
        limit,
        offset,
        hasMore
      })
    }

    // 网站端默认 snake_case（数组）
    const snakeCase = filteredLetters.map(letter => ({
      id: letter.id,
      user_id: letter.user_id,
      anonymous_id: letter.anonymous_id,
      link_id: letter.link_id,
      recipient_name: letter.recipient_name,
      message: letter.message,
      song_id: letter.song_id,
      song_title: letter.song_title,
      song_artist: letter.song_artist,
      song_album_cover: letter.song_album_cover,
      song_preview_url: letter.song_preview_url,
      song_spotify_url: letter.song_spotify_url,
      created_at: letter.created_at,
      updated_at: letter.updated_at,
      view_count: letter.view_count,
      is_public: letter.is_public,
      shareable_link: letter.shareable_link,
      user: (letter as any).user,
      author_profile: getAuthorProfile(letter),
    }))

    return NextResponse.json(snakeCase)
  } catch (error) {
    console.error('Error fetching explore letters:', error)
    return NextResponse.json({ error: 'Failed to fetch explore letters' }, { status: 500 })
  }
}