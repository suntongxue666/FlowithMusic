import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minLettersCount = parseInt(searchParams.get('minLettersCount') || '6', 10)
    const artistLimit = parseInt(searchParams.get('artistLimit') || '2', 10) // 限制返回的热门艺术家数量
    const letterLimitPerArtist = parseInt(searchParams.get('letterLimitPerArtist') || '12', 10) // 每个艺术家返回的Letters数量

    // 1. 获取热门艺术家
    const popularArtists = await letterService.getPopularArtists(20) // 获取足够多的艺术家进行筛选

    // 2. 筛选出Letter数量达到或超过 minLettersCount 的艺术家
    const hotArtists = popularArtists.filter(artist => artist.count >= minLettersCount)
                                     .slice(0, artistLimit) // 限制返回的热门艺术家数量

    const hotArtistSections: { artist: string; count: number; letters: Letter[] }[] = []

    // 3. 为每个热门艺术家获取他们的Letters
    for (const artistInfo of hotArtists) {
      try {
        const artistLetters = await letterService.getPublicLetters(
          letterLimitPerArtist,
          0,
          'created_at',
          { artist: artistInfo.artist }
        )

        // 过滤掉 message 长度小于 6 个单词的 Letter
        const filteredLetters = artistLetters.filter(letter => {
          const wordCount = letter.message.trim().split(/\s+/).length
          return wordCount >= 6
        })

        if (filteredLetters.length > 0) {
          hotArtistSections.push({
            artist: artistInfo.artist,
            count: artistInfo.count,
            letters: filteredLetters.map(letter => {
              if (format === 'camelCase') {
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
                  user: letter.user, // 包含关联用户信息
                };
              } else {
                // 默认返回snake_case，供网站使用
                return {
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
                  user: letter.user, // 包含关联用户信息
                };
              }
            })
          })
        }
      } catch (error) {
        console.error(`Error fetching letters for hot artist ${artistInfo.artist}:`, error)
      }
    }

    return NextResponse.json(hotArtistSections)
  } catch (error) {
    console.error('Error fetching hot artist posts:', error)
    return NextResponse.json({ error: 'Failed to fetch hot artist posts' }, { status: 500 })
  }
}