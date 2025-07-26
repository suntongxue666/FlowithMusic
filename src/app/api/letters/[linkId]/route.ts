import { NextRequest, NextResponse } from 'next/server'

// 临时的内存存储（生产环境中应该使用真正的数据库）
const letters = new Map()

// 简单的内存存储，用于跨请求共享数据
class ServerStorage {
  private static letters = new Map()
  
  static set(key: string, value: any) {
    this.letters.set(key, value)
  }
  
  static get(key: string) {
    return this.letters.get(key)
  }
  
  static has(key: string) {
    return this.letters.has(key)
  }
}

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
    
    // 尝试从服务器内存存储获取
    if (ServerStorage.has(linkId)) {
      const letter = ServerStorage.get(linkId)
      console.log('Letter found in server storage:', linkId)
      return NextResponse.json(letter)
    }

    // 如果都没找到，返回404
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
    
    // 如果Supabase失败，保存到服务器内存存储
    const letter = { ...letterData, link_id: linkId, created_at: new Date().toISOString() }
    ServerStorage.set(linkId, letter)
    console.log('Letter saved to server storage:', linkId)
    
    return NextResponse.json({ 
      ...letter,
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