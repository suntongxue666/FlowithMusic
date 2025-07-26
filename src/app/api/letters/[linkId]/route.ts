import { NextRequest, NextResponse } from 'next/server'

// 临时的内存存储（生产环境中应该使用真正的数据库）
const letters = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    
    // 首先尝试从Supabase获取
    try {
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { data, error } = await supabase
          .from('letters')
          .select('*')
          .eq('link_id', linkId)
          .single()
        
        if (!error && data) {
          return NextResponse.json(data)
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase failed, trying fallback:', supabaseError)
    }
    
    // 如果Supabase失败，返回404但带有友好消息
    return NextResponse.json(
      { 
        error: 'Letter not found',
        message: 'This letter might not be available due to technical issues. Please ask the sender to check the link.',
        linkId 
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const letterData = await request.json()
    
    // 首先尝试保存到Supabase
    try {
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { data, error } = await supabase
          .from('letters')
          .insert({ ...letterData, link_id: linkId })
          .select()
          .single()
        
        if (!error && data) {
          return NextResponse.json(data)
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase save failed:', supabaseError)
    }
    
    // 如果Supabase失败，临时存储在内存中（仅用于演示）
    letters.set(linkId, { ...letterData, link_id: linkId, created_at: new Date().toISOString() })
    
    return NextResponse.json({ 
      ...letterData, 
      link_id: linkId,
      created_at: new Date().toISOString(),
      fallback: true 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    )
  }
}