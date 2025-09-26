import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const publicLetters: Letter[] = await letterService.getPublicLetters(limit, offset, 'created_at')

    // 过滤掉 message 长度小于 6 个单词的 Letter
    const filteredLetters = publicLetters.filter(letter => {
      const wordCount = letter.message.trim().split(/\s+/).length
      return wordCount >= 6
    })

    // 格式化数据以适应App端需求，例如只返回必要字段
    const formattedLetters = filteredLetters.map(letter => ({
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
      // 如果需要用户头像和昵称，可以从 letter.user 中获取
      userDisplayName: letter.user?.display_name,
      userAvatarUrl: letter.user?.avatar_url,
    }))

    return NextResponse.json(formattedLetters)
  } catch (error) {
    console.error('Error fetching recent posts:', error)
    return NextResponse.json({ error: 'Failed to fetch recent posts' }, { status: 500 })
  }
}