import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase客户端未初始化' 
      }, { status: 500 })
    }

    // 检查auth.users表（需要管理员权限，可能会失败）
    let authUsers = []
    try {
      const { data: authData } = await supabase.auth.admin.listUsers()
      authUsers = authData?.users || []
    } catch (authError) {
      console.warn('无法访问auth.users:', authError)
    }

    // 检查自建users表
    let customUsersQuery = supabase
      .from('users')
      .select('*')
      .limit(10)

    if (email) {
      customUsersQuery = customUsersQuery.eq('email', email)
    }

    const { data: customUsers, error: customError } = await customUsersQuery

    // 检查当前会话
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    return NextResponse.json({
      success: true,
      searchEmail: email,
      results: {
        authUsers: {
          count: authUsers.length,
          users: authUsers.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at
          })),
          targetUser: email ? authUsers.find(u => u.email === email) : null
        },
        customUsers: {
          count: customUsers?.length || 0,
          users: customUsers || [],
          error: customError?.message,
          targetUser: email ? customUsers?.find(u => u.email === email) : null
        },
        currentSession: {
          hasSession: !!sessionData?.session,
          user: sessionData?.session?.user,
          error: sessionError?.message
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: '查询失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}