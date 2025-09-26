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

    // 返回原始的 Letter 结构，前端组件会根据 Letter 接口定义进行渲染
    const formattedLetters = filteredLetters.map(letter => ({
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
    }))

    return NextResponse.json(formattedLetters)
  } catch (error) {
    console.error('Error fetching recent posts:', error)
    return NextResponse.json({ error: 'Failed to fetch recent posts' }, { status: 500 })
  }
}