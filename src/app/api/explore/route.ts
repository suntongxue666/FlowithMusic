import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

    let fetchedLetters: Letter[] = []

    if (searchQuery) {
      fetchedLetters = await letterService.searchLetters(searchQuery, limit, offset)
    } else {
      fetchedLetters = await letterService.getPublicLetters(limit, offset, sortBy, { category })
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
    }))

    return NextResponse.json(snakeCase)
  } catch (error) {
    console.error('Error fetching explore letters:', error)
    return NextResponse.json({ error: 'Failed to fetch explore letters' }, { status: 500 })
  }
}