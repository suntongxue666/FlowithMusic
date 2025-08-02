import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    const body = await request.json()
    const { emoji, label, userInfo } = body
    
    if (!emoji || !label) {
      return NextResponse.json(
        { error: 'Emoji and label are required' },
        { status: 400 }
      )
    }
    
    console.log('📨 收到互动请求:', { emoji, label, userInfo })
    
    // 获取用户信息 - 优先使用请求体中的userInfo，然后从cookie获取
    let currentUser = null
    let anonymousId = null
    let userDisplayName = 'Anonymous'
    let userAvatarUrl = null
    
    // 方法1: 优先使用请求体中的用户信息（最准确）
    if (userInfo) {
      console.log('✅ 使用请求体中的用户信息')
      currentUser = userInfo.user_id ? { 
        id: userInfo.user_id,
        display_name: userInfo.user_display_name,
        avatar_url: userInfo.user_avatar_url 
      } : null
      anonymousId = userInfo.anonymous_id
      userDisplayName = userInfo.user_display_name || 'Anonymous'
      userAvatarUrl = userInfo.user_avatar_url
    } else {
      // 方法2: 从cookie获取（兜底方案）
      console.log('🔄 从cookie获取用户信息')
      const userCookie = request.headers.get('cookie')
      
      try {
        if (userCookie) {
          const userMatch = userCookie.match(/user=([^;]+)/)
          const anonymousMatch = userCookie.match(/anonymous_id=([^;]+)/)
          
          if (userMatch) {
            currentUser = JSON.parse(decodeURIComponent(userMatch[1]))
            userDisplayName = currentUser?.display_name || currentUser?.email?.split('@')[0] || 'User'
            userAvatarUrl = currentUser?.avatar_url
            console.log('👤 从cookie解析到登录用户:', userDisplayName)
          }
          if (anonymousMatch) {
            anonymousId = decodeURIComponent(anonymousMatch[1])
          }
        }
      } catch (error) {
        console.warn('⚠️ 解析cookie用户信息失败:', error)
      }
      
      // 如果没有匿名ID，生成一个临时的
      if (!anonymousId) {
        anonymousId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        console.log('🔄 生成临时匿名ID:', anonymousId)
      }
    }
    
    console.log('🎯 最终使用的用户信息:', {
      isLoggedIn: !!currentUser,
      userId: currentUser?.id,
      displayName: userDisplayName,
      hasAvatar: !!userAvatarUrl,
      anonymousId: anonymousId
    })
    
    // 获取用户代理信息
    const userAgent = request.headers.get('user-agent') || ''
    
    // 简化互动记录数据 - 使用处理后的用户信息
    const interactionData = {
      letter_link_id: linkId,
      user_id: currentUser?.id || null,
      anonymous_id: anonymousId,
      user_display_name: userDisplayName,
      user_avatar_url: userAvatarUrl,
      emoji: emoji,
      emoji_label: label,
      user_agent: userAgent.substring(0, 500) // 限制长度
      // created_at 由数据库自动生成，不需要显式设置
    }
    
    console.log('💝 记录Emoji互动:', {
      linkId,
      emoji,
      label,
      userId: currentUser?.id,
      anonymousId,
      displayName: interactionData.user_display_name
    })
    
    // 检查supabase连接
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // 插入互动记录
    const { error: interactionError } = await supabase
      .from('letter_interactions')
      .insert(interactionData)
    
    if (interactionError) {
      console.error('❌ 插入互动记录失败:', {
        error: interactionError,
        code: interactionError.code,
        message: interactionError.message,
        details: interactionError.details,
        hint: interactionError.hint,
        data: interactionData
      })
      return NextResponse.json(
        { 
          error: 'Failed to record interaction',
          details: interactionError.message,
          code: interactionError.code
        },
        { status: 500 }
      )
    }
    
    // 获取该emoji的总互动次数
    const { data: countData, error: countError } = await supabase
      .from('letter_interactions')
      .select('id')
      .eq('letter_link_id', linkId)
      .eq('emoji', emoji)
    
    const totalCount = countData?.length || 1
    
    return NextResponse.json({ 
      success: true,
      message: 'Interaction recorded successfully',
      totalCount
    })
    
  } catch (error) {
    console.error('💥 记录互动失败:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}

// 获取Letter的互动统计
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    
    console.log('🔍 GET 互动统计 - linkId:', linkId)
    
    // 检查supabase连接
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // 获取互动统计 - 只查询实际存在的字段
    const { data: interactions, error } = await supabase
      .from('letter_interactions')
      .select('emoji, emoji_label, user_display_name, user_avatar_url, created_at')
      .eq('letter_link_id', linkId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    console.log('📊 原始查询结果:', { 
      count: interactions?.length, 
      error, 
      sampleData: interactions?.slice(0, 3) 
    })
    
    if (error) {
      console.error('❌ 获取互动统计失败:', error)
      return NextResponse.json(
        { 
          error: 'Failed to get interactions',
          details: error.message,
          linkId 
        },
        { status: 500 }
      )
    }
    
    // 按emoji分组统计
    const stats = interactions?.reduce((acc: any, interaction) => {
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
      if (acc[emoji].recentUsers.length < 5) {
        acc[emoji].recentUsers.push({
          displayName: interaction.user_display_name,
          avatarUrl: interaction.user_avatar_url,
          createdAt: interaction.created_at
        })
      }
      return acc
    }, {})
    
    console.log('📈 最终统计结果:', Object.values(stats || {}))
    
    return NextResponse.json({
      success: true,
      stats: Object.values(stats || {}),
      totalInteractions: interactions?.length || 0,
      debug: {
        linkId,
        rawCount: interactions?.length || 0,
        statsCount: Object.keys(stats || {}).length
      }
    })
    
  } catch (error) {
    console.error('💥 获取互动统计失败:', error)
    return NextResponse.json(
      { error: 'Failed to get interaction stats' },
      { status: 500 }
    )
  }
}