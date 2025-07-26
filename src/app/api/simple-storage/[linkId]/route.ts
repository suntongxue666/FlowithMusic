import { NextRequest, NextResponse } from 'next/server'
import { Letter } from '@/lib/supabase'

// 简单的服务器端存储
class ServerLetterStorage {
  private static letters = new Map<string, Letter>()
  
  static save(linkId: string, letter: Letter) {
    this.letters.set(linkId, letter)
    console.log(`Letter saved to server storage: ${linkId}`)
  }
  
  static get(linkId: string): Letter | null {
    const letter = this.letters.get(linkId)
    if (letter) {
      console.log(`Letter found in server storage: ${linkId}`)
    } else {
      console.log(`Letter not found in server storage: ${linkId}`)
    }
    return letter || null
  }
  
  static getAll(): Letter[] {
    return Array.from(this.letters.values())
  }
  
  static getUserLetters(userId?: string, anonymousId?: string): Letter[] {
    const allLetters = this.getAll()
    return allLetters.filter(letter => {
      if (userId) {
        return letter.user_id === userId
      } else if (anonymousId) {
        return letter.anonymous_id === anonymousId
      }
      return false
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    
    const letter = ServerLetterStorage.get(linkId)
    
    if (letter) {
      return NextResponse.json(letter)
    } else {
      return NextResponse.json(
        { error: 'Letter not found', linkId },
        { status: 404 }
      )
    }
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
    
    const letter: Letter = {
      ...letterData,
      link_id: linkId,
      created_at: letterData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    ServerLetterStorage.save(linkId, letter)
    
    return NextResponse.json(letter)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    )
  }
}