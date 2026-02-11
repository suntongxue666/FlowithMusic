import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

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
    const format = searchParams.get('format') // camelCase 或默认

    let fetchedLetters: Letter[] = []

    if (searchQuery) {
      // 搜索范围：recipient_name、song_title、song_artist、message（由 letterService.searchLetters 实现）
      fetchedLetters = await letterService.searchLetters(searchQuery, limit, offset)
    } else {
      // 公开流
      fetchedLetters = await letterService.getPublicLetters(limit, offset, sortBy)
    }

    console.log(`🌐 API Explore: Fetched ${fetchedLetters.length} letters. Query: "${searchQuery}"`)

    // Explore 不做额外字数过滤，确保分页完整
    const filteredLetters = fetchedLetters

    if (format === 'camelCase') {
      // App 友好返回结构（包裹 items）
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
        user: letter.user,
      }))

      // total 目前不做成本高的统计查询，按是否还有下一页给出 hasMore
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
      user: letter.user,
    }))

    return NextResponse.json(snakeCase)
  } catch (error) {
    console.error('Error fetching explore letters:', error)
    return NextResponse.json({ error: 'Failed to fetch explore letters' }, { status: 500 })
  }
}