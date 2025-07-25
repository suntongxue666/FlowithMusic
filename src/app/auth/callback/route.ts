import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    console.error('No authorization code received')
    return NextResponse.redirect(`${origin}/history?error=no_code`)
  }

  try {
    // 检查Supabase是否可用
    if (!supabase) {
      console.warn('Supabase not configured, redirecting to history')
      return NextResponse.redirect(`${origin}/history`)
    }

    // 交换授权码获取会话
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/history?error=auth_failed`)
    }

    if (data.session) {
      console.log('Authentication successful for user:', data.session.user.email)
      // 重定向到认证回调页面进行数据迁移
      return NextResponse.redirect(`${origin}/auth/callback`)
    }

    return NextResponse.redirect(`${origin}/history`)
  } catch (error) {
    console.error('Unexpected error during authentication:', error)
    return NextResponse.redirect(`${origin}/history?error=unexpected`)
  }
}