import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const linkId = searchParams.get('linkId') || '202507281941WVPqxg'
  
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' })
    }
    
    // 先查询这个特定的linkId是否存在
    const { data: specificData, error: specificError } = await supabase
      .from('letters')
      .select('*')
      .eq('link_id', linkId)
      .single()
    
    // 同时查询所有包含这个linkId的记录（防止有重复）
    const { data: allMatches, error: allError } = await supabase
      .from('letters')
      .select('*')
      .eq('link_id', linkId)
    
    // 还要查询类似的linkId（防止格式问题）
    const { data: similarData, error: similarError } = await supabase
      .from('letters')
      .select('link_id, song_title, song_artist')
      .like('link_id', `%${linkId.slice(-6)}%`)
    
    return NextResponse.json({
      targetLinkId: linkId,
      specificQuery: {
        found: !!specificData,
        error: specificError,
        data: specificData
      },
      allMatches: {
        count: allMatches?.length || 0,
        error: allError,
        data: allMatches
      },
      similarLinkIds: {
        count: similarData?.length || 0,
        error: similarError,
        data: similarData
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (err) {
    return NextResponse.json({
      error: 'Query failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}