import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase连接不可用' 
      }, { status: 500 })
    }

    // 获取当前认证用户
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ 
        error: '用户未认证', 
        authError,
        hasAuthUser: !!authUser 
      }, { status: 401 })
    }

    // 获取数据库用户数据
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (dbError) {
      return NextResponse.json({ 
        error: '数据库查询失败', 
        dbError,
        authUserId: authUser.id 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at
      },
      dbUser: {
        id: dbUser.id,
        email: dbUser.email,
        google_id: dbUser.google_id,
        display_name: dbUser.display_name,
        social_media_info: dbUser.social_media_info,
        social_media_fields: dbUser.social_media_info ? Object.keys(dbUser.social_media_info).length : 0
      }
    })

  } catch (error) {
    console.error('Fix social media API error:', error)
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase连接不可用' 
      }, { status: 500 })
    }

    // 获取当前认证用户
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ 
        error: '用户未认证', 
        authError 
      }, { status: 401 })
    }

    // 清理社交媒体数据 - 只保留有效的社交媒体平台字段
    const validPlatforms = ['whatsapp', 'tiktok', 'instagram', 'facebook', 'x']
    
    // 获取当前数据库用户数据
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('social_media_info')
      .eq('id', authUser.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        error: '获取用户数据失败', 
        fetchError 
      }, { status: 500 })
    }

    // 提取纯社交媒体信息
    const cleanSocialMedia: any = {}
    
    if (currentUser.social_media_info && typeof currentUser.social_media_info === 'object') {
      validPlatforms.forEach(platform => {
        const value = currentUser.social_media_info[platform]
        if (value && typeof value === 'string' && value.trim() !== '') {
          cleanSocialMedia[platform] = value.trim()
        }
      })
    }

    // 更新数据库
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        social_media_info: cleanSocialMedia
      })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: '更新失败', 
        updateError 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '社交媒体数据清理成功',
      before: currentUser.social_media_info,
      after: updatedUser.social_media_info,
      fieldsRemoved: currentUser.social_media_info ? 
        Object.keys(currentUser.social_media_info).length - Object.keys(cleanSocialMedia).length : 0
    })

  } catch (error) {
    console.error('Clean social media API error:', error)
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function PUT() {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase连接不可用' 
      }, { status: 500 })
    }

    // 获取当前认证用户
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ 
        error: '用户未认证', 
        authError 
      }, { status: 401 })
    }

    // 测试社交媒体保存
    const testData = {
      whatsapp: '+1234567890-test'
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        social_media_info: testData
      })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: '保存测试失败', 
        updateError 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '社交媒体保存测试成功',
      testData,
      savedData: updatedUser.social_media_info
    })

  } catch (error) {
    console.error('Test social media save API error:', error)
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}