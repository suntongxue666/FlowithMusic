
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    // 逻辑：随机获取一个最近活跃的已登录用户
    // 为了性能和随机性，我们先查出总数，再用 offset 随机取一个
    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      // 过滤条件：有邮箱（代表已登录），且不是当前请求者（如果有的话）
      .not('email', 'is', null)

    if (countError || count === null || count === 0) {
      throw new Error('No users found for matching')
    }

    const randomIndex = Math.floor(Math.random() * (count as number))

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .not('email', 'is', null)
      .range(randomIndex, randomIndex)
      .single()

    if (error || !data) {
      throw new Error('Failed to fetch random user')
    }

    return NextResponse.json({ userId: data.id })
  } catch (error: any) {
    console.error('Random user fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
