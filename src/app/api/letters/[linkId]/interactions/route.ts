import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await context.params
    const body = await request.json()
    const { emoji, label } = body
    
    if (!emoji || !label) {
      return NextResponse.json(
        { error: 'Emoji and label are required' },
        { status: 400 }
      )
    }
    
    // 获取当前用户信息（从请求头或cookie中）
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
    
    // 获取用户代理信息和IP地址
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'
    
    // 准备互动记录数据 - 只使用现有数据库字段
    const interactionData = {
      letter_link_id: linkId,
      user_id: currentUser?.id || null,
      anonymous_id: anonymousId,
      user_display_name: currentUser?.display_name || 'Anonymous',
      user_avatar_url: currentUser?.avatar_url || null,
      emoji: emoji,
      emoji_label: label,
      user_agent: userAgent,
      created_at: new Date().toISOString()
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
    
    // 检查supabase连接
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }
    
    // 获取互动统计
    const { data: interactions, error } = await supabase
      .from('letter_interactions')
      .select('emoji, emoji_label, user_display_name, user_avatar_url, created_at')
      .eq('letter_link_id', linkId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('❌ 获取互动统计失败:', error)
      return NextResponse.json(
        { error: 'Failed to get interactions' },
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
    
    return NextResponse.json({
      success: true,
      stats: Object.values(stats || {}),
      totalInteractions: interactions?.length || 0
    })
    
  } catch (error) {
    console.error('💥 获取互动统计失败:', error)
    return NextResponse.json(
      { error: 'Failed to get interaction stats' },
      { status: 500 }
    )
  }
}