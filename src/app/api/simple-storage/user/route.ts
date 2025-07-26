import { NextRequest, NextResponse } from 'next/server'
import { Letter } from '@/lib/supabase'

// 导入共享的存储类
import { ServerLetterStorage } from '../[linkId]/route'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const anonymousId = searchParams.get('anonymousId')
    
    const letters = ServerLetterStorage.getUserLetters(
      userId || undefined, 
      anonymousId || undefined
    )
    
    console.log(`Found ${letters.length} letters for user:`, { userId, anonymousId })
    
    return NextResponse.json(letters)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}