import { NextRequest, NextResponse } from 'next/server'
import { Letter } from '@/lib/supabase'

// 重用相同的服务器存储类
class ServerLetterStorage {
  private static letters = new Map<string, Letter>()
  
  static getAll(): Letter[] {
    return Array.from(this.letters.values())
  }
  
  static getUserLetters(userId?: string, anonymousId?: string): Letter[] {
    const allLetters = this.getAll()
    return allLetters.filter(letter => {
      if (userId && userId !== '') {
        return letter.user_id === userId
      } else if (anonymousId && anonymousId !== '') {
        return letter.anonymous_id === anonymousId
      }
      return false
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

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