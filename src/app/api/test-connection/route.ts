import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' })
    }
    
    // 简单的连接测试
    const { data, error, count } = await supabase
      .from('letters')
      .select('link_id, song_title, song_artist', { count: 'exact' })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      connection: 'OK',
      totalCount: count,
      sampleData: data,
      timestamp: new Date().toISOString()
    })
    
  } catch (err) {
    return NextResponse.json({
      error: 'Connection failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}