import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    
    // 获取当前用户信息（从请求头或cookie中）
    const authHeader = request.headers.get('authorization')
    const userCookie = request.headers.get('cookie')
    
    // 简化的用户信息获取（在服务端环境中）
    let currentUser = null
    let anonymousId = null
    
    try {
      // 尝试从cookie中解析用户信息
      if (userCookie) {
        const userMatch = userCookie.match(/user=([^;]+)/)
        const anonymousMatch = userCookie.match(/anonymous_id=([^;]+)/)
        
        if (userMatch) {
          currentUser = JSON.parse(decodeURIComponent(userMatch[1]))
        }
        if (anonymousMatch) {
          anonymousId = decodeURIComponent(anonymousMatch[1])
        }
      }
      
      // 如果没有匿名ID，生成一个临时的
      if (!anonymousId) {
        anonymousId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      }
    } catch (error) {
      console.warn('解析用户信息失败:', error)
      // 生成临时匿名ID
      anonymousId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    }
    
    // 获取用户代理和IP信息
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // 准备浏览记录数据
    const viewData = {
      letter_link_id: linkId,
      viewer_user_id: currentUser?.id || null,
      viewer_anonymous_id: anonymousId,
      viewer_display_name: currentUser?.display_name || 'Anonymous',
      viewer_avatar_url: currentUser?.avatar_url || null,
      user_agent: userAgent,
      ip_address: ip,
      viewed_at: new Date().toISOString()
    }
    
    console.log('📊 记录Letter浏览:', {
      linkId,
      userId: currentUser?.id,
      anonymousId,
      displayName: viewData.viewer_display_name
    })
    
    // 检查supabase连接
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // 插入浏览记录
    const { error: viewError } = await supabase
      .from('letter_views')
      .insert(viewData)
    
    if (viewError) {
      console.error('❌ 插入浏览记录失败:', viewError)
      // 不阻塞主流程，只记录错误
    }
    
    // 更新Letter的浏览计数
    const { error: updateError } = await supabase
      .rpc('increment_view_count', { 
        letter_link_id: linkId 
      })
    
    if (updateError) {
      console.error('❌ 更新浏览计数失败:', updateError)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'View recorded successfully'
    })
    
  } catch (error) {
    console.error('💥 记录浏览失败:', error)
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    )
  }
}