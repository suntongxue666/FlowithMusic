import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🎲 API: Starting random user fetch...')
    const { supabaseServer } = await import('@/lib/supabase-server')
    if (!supabaseServer) {
      console.error('❌ Supabase server client not found')
      throw new Error('Supabase server not initialized')
    }

    // 1. 获取用户总数
    const { count, error: countError } = await supabaseServer
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('email', 'is', null)

    if (countError) {
      console.error('❌ Supabase count error:', countError)
      throw new Error(`Count failed: ${countError.message}`)
    }

    if (!count || count === 0) {
      console.warn('⚠️ No logged-in users found in database')
      return NextResponse.json({ 
        userId: null,
        displayName: 'A Music Soul'
      })
    }

    // 2. 随机抽取一个
    console.log(`📊 Found ${count} potential matches`)
    const randomIndex = Math.floor(Math.random() * count)

    const { data, error } = await supabaseServer
      .from('users')
      .select('id, display_name')
      .not('email', 'is', null)
      .range(randomIndex, randomIndex)
      .single()

    if (error || !data) {
      console.error('❌ Fetch error:', error)
      throw new Error('Failed to fetch random user')
    }

    console.log('✅ Matched user:', data.display_name)
    return NextResponse.json({ 
      userId: data.id,
      displayName: data.display_name || 'A Music Soul'
    })
  } catch (error: any) {
    console.error('💥 Random user API crashed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
