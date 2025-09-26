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
            letters: filteredLetters.map(letter => ({
              id: letter.id,
              linkId: letter.link_id,
              recipientName: letter.recipient_name,
              message: letter.message,
              songTitle: letter.song_title,
              songArtist: letter.song_artist,
              songAlbumCover: letter.song_album_cover,
              createdAt: letter.created_at,
              viewCount: letter.view_count,
              isPublic: letter.is_public,
              shareableLink: letter.shareable_link,
              userDisplayName: letter.user?.display_name,
              userAvatarUrl: letter.user?.avatar_url,
            }))
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