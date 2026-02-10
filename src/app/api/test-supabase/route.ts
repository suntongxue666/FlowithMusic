import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🧪 Testing Supabase connection and database tables...')
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase client not initialized',
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
        }
      })
    }

    // 并行测试所有表
    const [lettersResult, usersResult, sessionsResult, interactionsResult] = await Promise.allSettled([
      // 测试letters表
      supabase
        .from('letters')
        .select('id, user_id, anonymous_id, recipient_name, created_at', { count: 'exact' })
        .limit(3),
      
      // 测试users表
      supabase
        .from('users')
        .select('id, email, display_name, created_at', { count: 'exact' })
        .limit(5),
      
      // 测试anonymous_sessions表
      supabase
        .from('anonymous_sessions')
        .select('id, anonymous_id, created_at', { count: 'exact' })
        .limit(3),
      
      // 测试letter_interactions表
      supabase
        .from('letter_interactions')
        .select('id, letter_link_id, user_id, emoji, created_at', { count: 'exact' })
        .limit(3)
    ])

    // 处理结果
    const processResult = (result: PromiseSettledResult<any>, tableName: string) => {
      if (result.status === 'fulfilled') {
        const { data, error, count } = result.value
        return {
          table: tableName,
          success: !error,
          count: count || 0,
          data: data || [],
          error: error?.message || null
        }
      } else {
        return {
          table: tableName,
          success: false,
          count: 0,
          data: [],
          error: result.reason?.message || '查询失败'
        }
      }
    }

    const results = {
      letters: processResult(lettersResult, 'letters'),
      users: processResult(usersResult, 'users'),
      sessions: processResult(sessionsResult, 'anonymous_sessions'),
      interactions: processResult(interactionsResult, 'letter_interactions')
    }

    // 计算总体状态
    const allSuccess = Object.values(results).every(r => r.success)
    const totalTables = Object.keys(results).length
    const successfulTables = Object.values(results).filter(r => r.success).length

    return NextResponse.json({ 
      success: allSuccess,
      summary: {
        totalTables,
        successfulTables,
        status: `${successfulTables}/${totalTables} 表连接成功`
      },
      tables: results,
      timestamp: new Date().toISOString(),
      message: allSuccess ? '所有数据库表测试通过' : '部分表存在问题'
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString()
    })
  }
}