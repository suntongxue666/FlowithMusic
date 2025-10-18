import { NextResponse } from 'next/server'
import { supabaseClient as supabase } from '@/lib/supabase-direct'

export async function GET() {
  try {
    console.log('🧪 Testing Supabase auth connection...')
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase client not initialized'
      })
    }

    // 测试简单的auth状态
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    console.log('🔍 Auth session test:', { authData, authError })

    // 测试简单的数据库查询（应该会返回401，但我们可以看到具体错误）
    const { data: testData, error: testError } = await supabase
      .from('letters')
      .select('count')
      .limit(1)

    console.log('🔍 Database test:', { testData, testError })

    return NextResponse.json({
      success: true,
      auth: {
        hasSession: !!authData.session,
        error: authError?.message
      },
      database: {
        data: testData,
        error: testError?.message
      },
      config: {
        url: 'https://oiggdnnehohoaycyiydn.supabase.co',
        hasClient: !!supabase
      }
    })
  } catch (error) {
    console.error('❌ Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}