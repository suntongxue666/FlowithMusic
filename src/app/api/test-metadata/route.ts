import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const linkId = searchParams.get('linkId')
  
  if (!linkId) {
    return NextResponse.json({ error: 'linkId is required' }, { status: 400 })
  }
  
  try {
    console.log('=== API测试元数据生成 ===')
    console.log('Environment check:', {
      isServer: typeof window === 'undefined',
      hasSupabase: !!supabase,
      linkId: linkId
    })
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not available',
        debug: { hasSupabase: false }
      })
    }
    
    // 尝试查询数据
    console.log('开始查询数据库...')
    const { data, error } = await supabase
      .from('letters')
      .select('song_title, song_artist, song_album_cover, created_at, is_public')
      .eq('link_id', linkId)
      .single()
    
    console.log('查询完成:', { 
      hasData: !!data, 
      hasError: !!error,
      dataKeys: data ? Object.keys(data) : [],
      errorMessage: error?.message 
    })
    
    if (error) {
      console.error('数据库查询错误:', error)
      return NextResponse.json({
        error: 'Database query failed',
        details: error,
        debug: { linkId, supabaseAvailable: !!supabase }
      })
    }
    
    if (!data) {
      console.log('未找到数据')
      return NextResponse.json({
        error: 'No data found',
        debug: { linkId, queryResult: 'null' }
      })
    }
    
    console.log('原始数据:', JSON.stringify(data, null, 2))
    
    // 检查数据有效性
    const hasValidSongData = data && 
      data.song_title && 
      data.song_artist && 
      data.song_title.trim() !== '' && 
      data.song_artist.trim() !== ''
    
    let title
    if (hasValidSongData) {
      title = `Send the Song: Handwritten Letter with "${data.song_title}" by ${data.song_artist} | FlowithMusic`
    } else {
      title = 'Personal Music Letter | FlowithMusic'
    }
    
    return NextResponse.json({
      success: true,
      data: {
        song_title: data.song_title,
        song_artist: data.song_artist,
        song_album_cover: data.song_album_cover,
        hasValidSongData,
        generatedTitle: title,
        // 详细的数据分析
        dataAnalysis: {
          song_title_type: typeof data.song_title,
          song_title_value: data.song_title,
          song_title_length: data.song_title?.length,
          song_artist_type: typeof data.song_artist,
          song_artist_value: data.song_artist,
          song_artist_length: data.song_artist?.length,
          raw_data: data
        }
      },
      debug: {
        linkId,
        isPublic: data.is_public,
        createdAt: data.created_at
      }
    })
    
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({
      error: 'Server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}