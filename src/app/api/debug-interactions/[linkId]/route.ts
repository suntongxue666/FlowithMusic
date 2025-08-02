import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    
    console.log('🔍 调试API - linkId:', linkId)
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json({ error: 'No supabase client' }, { status: 500 })
    }
    
    // 直接查询看看有什么数据
    const { data: rawData, error: rawError } = await supabase
      .from('letter_interactions')
      .select('*')
      .eq('letter_link_id', linkId)
    
    console.log('📊 原始查询结果:', { rawData, rawError, count: rawData?.length })
    
    if (rawError) {
      console.error('❌ 原始查询失败:', rawError)
      return NextResponse.json({ 
        error: 'Raw query failed', 
        details: rawError.message,
        linkId 
      }, { status: 500 })
    }
    
    // 按emoji分组统计
    const stats = rawData?.reduce((acc: any, interaction) => {
      const emoji = interaction.emoji
      if (!acc[emoji]) {
        acc[emoji] = {
          emoji,
          label: interaction.emoji_label,
          count: 0,
          recentUsers: []
        }
      }
      acc[emoji].count++
      return acc
    }, {})
    
    console.log('📈 统计结果:', stats)
    
    return NextResponse.json({
      success: true,
      linkId,
      rawDataCount: rawData?.length || 0,
      rawData: rawData?.slice(0, 5), // 只显示前5条
      stats: Object.values(stats || {}),
      debug: true
    })
    
  } catch (error) {
    console.error('💥 调试API错误:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}