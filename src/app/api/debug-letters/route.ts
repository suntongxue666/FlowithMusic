import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug endpoint called')
    
    // 1. 检查Supabase连接
    let supabaseStatus = 'unknown'
    let supabaseLetters: any[] = []
    try {
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { data, error } = await supabase
          .from('letters')
          .select('link_id, recipient_name, is_public, created_at')
          .order('created_at', { ascending: false })
          .limit(10)
          
        if (error) {
          supabaseStatus = `error: ${error.message}`
        } else {
          supabaseStatus = 'connected'
          supabaseLetters = data || []
        }
      } else {
        supabaseStatus = 'not initialized'
      }
    } catch (supabaseError) {
      supabaseStatus = `connection failed: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}`
    }
    
    // 2. 检查API Letters存储
    let apiStorageStatus = 'unknown'
    try {
      const apiResponse = await fetch(`${request.nextUrl.origin}/api/letters/debug-all`, {
        method: 'PUT'
      })
      if (apiResponse.ok) {
        const apiData = await apiResponse.json()
        apiStorageStatus = `${apiData.globalStorageSize} letters stored`
      } else {
        apiStorageStatus = 'API storage not accessible'
      }
    } catch (apiError) {
      apiStorageStatus = `API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      supabase: {
        status: supabaseStatus,
        recentLetters: supabaseLetters
      },
      apiStorage: {
        status: apiStorageStatus
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}