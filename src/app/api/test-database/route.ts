import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🧪 API: 开始用户创建测试...')
    
    if (!supabase) {
      return Response.json({ 
        error: 'Supabase客户端未初始化',
        success: false 
      })
    }

    // 检查自建users表
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('id, email, display_name, created_at')
      .limit(5)

    // 检查匿名会话
    const { data: sessions, error: sessionsError } = await supabase
      .from('anonymous_sessions')
      .select('id, anonymous_id, created_at')
      .limit(3)

    // 检查letters表
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select('id, user_id, anonymous_id, recipient_name')
      .limit(3)

    // 检查letter_interactions表
    const { data: interactions, error: interactionsError } = await supabase
      .from('letter_interactions')
      .select('id, letter_link_id, user_id, emoji')
      .limit(3)

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        users: {
          count: customUsers?.length || 0,
          data: customUsers,
          error: customError?.message
        },
        sessions: {
          count: sessions?.length || 0,
          data: sessions,
          error: sessionsError?.message
        },
        letters: {
          count: letters?.length || 0,
          data: letters,
          error: lettersError?.message
        },
        interactions: {
          count: interactions?.length || 0,
          data: interactions,
          error: interactionsError?.message
        }
      }
    })

  } catch (error) {
    console.error('💥 API测试失败:', error)
    return Response.json({
      success: false,
      error: 'API测试异常',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}