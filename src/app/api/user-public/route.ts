
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [User Public API] Missing configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 使用管理员权限绕过 RLS 获取公开资料
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await adminClient
      .from('users')
      .select('id, display_name, avatar_url, is_premium, anonymous_id')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ [User Public API] DB Error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('💥 [User Public API] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
