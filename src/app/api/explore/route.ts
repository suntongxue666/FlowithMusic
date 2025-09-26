import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '18', 10) // 默认每页18个
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const searchQuery = searchParams.get('searchQuery') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at' // 默认按创建时间排序

    let fetchedLetters: Letter[] = []

    if (searchQuery.trim()) {
      // 如果有搜索词，则调用搜索服务
      fetchedLetters = await letterService.searchLetters(searchQuery.trim(), limit, offset)
    } else {
      // 否则获取公开Letters
      fetchedLetters = await letterService.getPublicLetters(limit, offset, sortBy as any) // sortBy需要匹配LetterService的类型
    }

    // 过滤掉 message 长度小于 6 个单词的 Letter
    const filteredLetters = fetchedLetters.filter(letter => {
      const wordCount = letter.message.trim().split(/\s+/).length
      return wordCount >= 6
    })

    // 格式化数据以适应App端需求
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
      userDisplayName: letter.user?.display_name,
      userAvatarUrl: letter.user?.avatar_url,
    }))

    return NextResponse.json(formattedLetters)
  } catch (error) {
    console.error('Error fetching explore letters:', error)
    return NextResponse.json({ error: 'Failed to fetch explore letters' }, { status: 500 })
  }
}