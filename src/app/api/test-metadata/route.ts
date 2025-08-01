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
    
    // 检查数据有效性 - 处理可能的数组结构
    const letterData = Array.isArray(data) ? data[0] : data
    const hasValidSongData = letterData && 
      letterData.song_title && 
      letterData.song_artist && 
      letterData.song_title.trim() !== '' && 
      letterData.song_artist.trim() !== ''
    
    let title
    if (hasValidSongData) {
      title = `Send the Song: Handwritten Letter with "${letterData.song_title}" by ${letterData.song_artist} | FlowithMusic`
    } else {
      title = 'Personal Music Letter | FlowithMusic'
    }
    
    return NextResponse.json({
      success: true,
      data: {
        song_title: letterData?.song_title,
        song_artist: letterData?.song_artist,
        song_album_cover: letterData?.song_album_cover,
        hasValidSongData,
        generatedTitle: title,
        // 详细的数据分析
        dataAnalysis: {
          isArray: Array.isArray(data),
          song_title_type: typeof letterData?.song_title,
          song_title_value: letterData?.song_title,
          song_title_length: letterData?.song_title?.length,
          song_artist_type: typeof letterData?.song_artist,
          song_artist_value: letterData?.song_artist,
          song_artist_length: letterData?.song_artist?.length,
          raw_data: data
        }
      },
      debug: {
        linkId,
        isPublic: letterData?.is_public,
        createdAt: letterData?.created_at
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