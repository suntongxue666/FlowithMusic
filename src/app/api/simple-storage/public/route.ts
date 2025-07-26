import { NextRequest, NextResponse } from 'next/server'

// 简单的内存存储，用于跨请求共享数据
class ServerStorage {
  private static letters = new Map()
  
  static set(key: string, value: any) {
    this.letters.set(key, value)
  }
  
  static get(key: string) {
    return this.letters.get(key)
  }
  
  static getAll() {
    return Array.from(this.letters.values())
  }
  
  static has(key: string) {
    return this.letters.has(key)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // 获取所有公开的Letters
    const allLetters = ServerStorage.getAll()
    const publicLetters = allLetters
      .filter((letter: any) => letter.is_public === true)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
    
    console.log(`📝 Simple storage public letters: found ${publicLetters.length} out of ${allLetters.length}`)
    
    return NextResponse.json(publicLetters)
  } catch (error) {
    console.error('Failed to get public letters from simple storage:', error)
    return NextResponse.json(
      { error: 'Failed to get public letters' },
      { status: 500 }
    )
  }
}