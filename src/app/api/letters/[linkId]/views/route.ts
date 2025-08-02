import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    const body = await request.json()
    const { 
      viewStartTime, 
      viewEndTime, 
      viewDuration, 
      sessionId,
      pageVisible,
      scrollDepth,
      interactionCount 
    } = body
    
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
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'
    const referer = request.headers.get('referer') || ''
    
    // 准备浏览记录数据
    const viewData = {
      letter_link_id: linkId,
      viewer_user_id: currentUser?.id || null,
      viewer_anonymous_id: anonymousId,
      viewer_display_name: currentUser?.display_name || 'Anonymous',
      viewer_avatar_url: currentUser?.avatar_url || null,
      session_id: sessionId || `session_${Date.now()}_${anonymousId}`,
      view_start_time: viewStartTime || new Date().toISOString(),
      view_end_time: viewEndTime || new Date().toISOString(),
      view_duration_seconds: Math.round(viewDuration || 0),
      page_visible_time_seconds: Math.round(pageVisible || 0),
      scroll_depth_percentage: Math.round(scrollDepth || 0),
      interaction_count: interactionCount || 0,
      user_agent: userAgent,
      ip_address: ipAddress,
      referer_url: referer,
      viewed_at: new Date().toISOString()
    }
    
    console.log('📊 记录Letter浏览:', {
      linkId,
      userId: currentUser?.id,
      anonymousId,
      displayName: viewData.viewer_display_name,
      viewDuration: viewData.view_duration_seconds,
      pageVisible: viewData.page_visible_time_seconds,
      scrollDepth: viewData.scroll_depth_percentage,
      interactions: viewData.interaction_count
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

// 获取浏览统计
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // 获取详细的浏览记录
    const { data: views, error } = await supabase
      .from('letter_views')
      .select(`
        viewer_display_name, 
        viewer_avatar_url, 
        view_duration_seconds,
        page_visible_time_seconds,
        scroll_depth_percentage,
        interaction_count,
        viewed_at, 
        ip_address,
        session_id,
        referer_url
      `)
      .eq('letter_link_id', linkId)
      .order('viewed_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('❌ 获取浏览统计失败:', error)
      return NextResponse.json(
        { error: 'Failed to get view stats' },
        { status: 500 }
      )
    }
    
    // 计算统计信息
    const totalViews = views?.length || 0
    const totalViewTime = views?.reduce((sum, view) => sum + (view.view_duration_seconds || 0), 0) || 0
    const totalVisibleTime = views?.reduce((sum, view) => sum + (view.page_visible_time_seconds || 0), 0) || 0
    const averageViewTime = totalViews > 0 ? totalViewTime / totalViews : 0
    const averageVisibleTime = totalViews > 0 ? totalVisibleTime / totalViews : 0
    const averageScrollDepth = totalViews > 0 ? views.reduce((sum, view) => sum + (view.scroll_depth_percentage || 0), 0) / totalViews : 0
    const totalInteractions = views?.reduce((sum, view) => sum + (view.interaction_count || 0), 0) || 0
    
    // 去重统计
    const uniqueViewers = new Set(views?.map(v => v.ip_address)).size
    const uniqueSessions = new Set(views?.map(v => v.session_id)).size
    
    // 来源统计
    const refererStats = views?.reduce((acc: any, view) => {
      const referer = view.referer_url || 'Direct'
      acc[referer] = (acc[referer] || 0) + 1
      return acc
    }, {})
    
    return NextResponse.json({
      success: true,
      stats: {
        totalViews,
        uniqueViewers,
        uniqueSessions,
        totalViewTimeSeconds: totalViewTime,
        totalVisibleTimeSeconds: totalVisibleTime,
        averageViewTimeSeconds: Math.round(averageViewTime),
        averageVisibleTimeSeconds: Math.round(averageVisibleTime),
        averageScrollDepthPercentage: Math.round(averageScrollDepth),
        totalInteractions,
        averageInteractionsPerView: totalViews > 0 ? Math.round(totalInteractions / totalViews * 10) / 10 : 0,
        refererStats,
        recentViews: views?.slice(0, 20).map(view => ({
          displayName: view.viewer_display_name,
          avatarUrl: view.viewer_avatar_url,
          viewDurationSeconds: view.view_duration_seconds,
          visibleTimeSeconds: view.page_visible_time_seconds,
          scrollDepthPercentage: view.scroll_depth_percentage,
          interactionCount: view.interaction_count,
          viewedAt: view.viewed_at,
          sessionId: view.session_id
        }))
      }
    })
    
  } catch (error) {
    console.error('💥 获取浏览统计失败:', error)
    return NextResponse.json(
      { error: 'Failed to get view stats' },
      { status: 500 }
    )
  }
}