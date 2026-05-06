
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  const results: any = {
    linkId,
    timestamp: new Date().toISOString(),
    steps: []
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    results.config = {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      url: supabaseUrl
    }

    // 1. 使用 Anon Key 尝试 (模拟正常用户)
    const anonClient = createClient(supabaseUrl!, supabaseAnonKey!)
    results.steps.push('Trying with Anon Key...')
    const { data: anonData, error: anonError } = await anonClient
      .from('letters')
      .select('*')
      .eq('link_id', linkId)
      .single()
    
    results.anonResult = { 
      success: !!anonData, 
      error: anonError?.message,
      data: anonData ? 'Found' : 'Not Found'
    }

    // 2. 如果失败，使用 Service Role Key 尝试 (管理权限)
    if (!anonData && supabaseServiceKey) {
      results.steps.push('Trying with Service Role Key...')
      const adminClient = createClient(supabaseUrl!, supabaseServiceKey)
      const { data: adminData, error: adminError } = await adminClient
        .from('letters')
        .select('*')
        .eq('link_id', linkId)
        .single()
      
      results.adminResult = { 
        success: !!adminData, 
        error: adminError?.message,
        data: adminData ? 'Found' : 'Not Found'
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 })
  }
}
