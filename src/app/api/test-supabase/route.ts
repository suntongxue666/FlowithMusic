import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing Supabase connection from server...')
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase client not initialized',
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
        }
      })
    }

    // 测试简单查询
    const { data, error, count } = await supabase
      .from('letters')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({ 
      success: true, 
      count,
      letters: data,
      message: 'Server-side Supabase connection successful'
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    })
  }
}