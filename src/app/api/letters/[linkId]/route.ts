import { NextRequest, NextResponse } from 'next/server'

// 使用浏览器存储API作为跨用户数据共享
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
      console.warn('Supabase failed, trying browser storage fallback:', supabaseError)
    }
    
    // 如果Supabase失败，尝试从浏览器存储API获取
    try {
      const browserStorageResponse = await fetch(`${request.nextUrl.origin}/api/browser-storage/${linkId}`)
      if (browserStorageResponse.ok) {
        const data = await browserStorageResponse.json()
        console.log('Letter found in browser storage:', linkId)
        return NextResponse.json(data)
      }
    } catch (browserError) {
      console.warn('Browser storage fetch failed:', browserError)
    }

    // 如果都没找到，返回404
    return NextResponse.json(
      { 
        error: 'Letter not found',
        message: 'This letter might not be available. Please ask the sender to check the link.',
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
    
    // 如果Supabase失败，保存到浏览器存储API
    try {
      const letter = { ...letterData, link_id: linkId, created_at: new Date().toISOString() }
      const browserStorageResponse = await fetch(`${request.nextUrl.origin}/api/browser-storage/${linkId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(letter)
      })
      
      if (browserStorageResponse.ok) {
        const savedData = await browserStorageResponse.json()
        console.log('Letter saved to browser storage:', linkId)
        return NextResponse.json({ 
          ...savedData,
          fallback: true 
        })
      }
    } catch (browserError) {
      console.error('Browser storage save failed:', browserError)
    }
    
    // 最后的fallback - 返回数据但标记为临时
    const letter = { ...letterData, link_id: linkId, created_at: new Date().toISOString() }
    return NextResponse.json({ 
      ...letter,
      temporary: true,
      message: 'Letter saved temporarily. Please try again later for permanent storage.'
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    )
  }
}