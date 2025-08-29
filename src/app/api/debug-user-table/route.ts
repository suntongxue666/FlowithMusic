import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // 尝试导入Supabase服务端客户端
    let supabaseServer
    try {
      const module = await import('@/lib/supabase-server')
      supabaseServer = module.supabaseServer
    } catch (importError) {
      console.error('❌ 无法导入supabase-server:', importError)
      return NextResponse.json({ 
        error: 'Supabase server not available',
        details: importError instanceof Error ? importError.message : 'Unknown import error'
      }, { status: 500 })
    }

    if (!supabaseServer) {
      return NextResponse.json({ 
        error: 'Supabase server client not initialized' 
      }, { status: 500 })
    }

    // 查询用户数据
    console.log('🔍 查询用户数据, ID:', userId)
    
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('❌ 查询用户失败:', userError)
      return NextResponse.json({
        error: 'Failed to query user',
        details: userError.message,
        code: userError.code
      }, { status: 500 })
    }

    console.log('✅ 用户数据查询成功')

    // 测试更新操作
    const testUpdate = {
      social_media_info: {
        test: 'debug_value',
        timestamp: new Date().toISOString()
      }
    }

    console.log('🔄 测试更新操作...')
    
    const { data: updateData, error: updateError } = await supabaseServer
      .from('users')
      .update(testUpdate)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 更新测试失败:', updateError)
      return NextResponse.json({
        userData,
        updateTest: {
          success: false,
          error: updateError.message,
          code: updateError.code
        }
      })
    }

    console.log('✅ 更新测试成功')

    return NextResponse.json({
      userData,
      updateTest: {
        success: true,
        updatedData: updateData
      }
    })

  } catch (error) {
    console.error('💥 API错误:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}