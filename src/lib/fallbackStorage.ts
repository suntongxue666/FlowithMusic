// 备用存储解决方案
import { Letter } from './supabase'

// 使用Vercel Edge Config或简单的内存存储作为备用
class FallbackStorage {
  private static instance: FallbackStorage
  private letters: Map<string, Letter> = new Map()

  static getInstance(): FallbackStorage {
    if (!FallbackStorage.instance) {
      FallbackStorage.instance = new FallbackStorage()
    }
    return FallbackStorage.instance
  }

  // 保存Letter到备用存储
  async saveLetter(letter: Letter): Promise<Letter> {
    try {
      // 在浏览器环境中，通过API保存到服务器内存
      if (typeof window !== 'undefined') {
        try {
          const response = await fetch(`/api/letters/${letter.link_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(letter)
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('Letter saved via API to server storage:', letter.link_id)
            return data
          }
        } catch (apiError) {
          console.warn('API save failed:', apiError)
        }
      }

      // 尝试保存到Vercel KV（如果可用）
      if (typeof process !== 'undefined' && process.env.KV_REST_API_URL) {
        const response = await fetch(`${process.env.KV_REST_API_URL}/set/${letter.link_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(letter)
        })
        
        if (response.ok) {
          console.log('Letter saved to Vercel KV:', letter.link_id)
          return letter
        }
      }
    } catch (error) {
      console.warn('External storage not available:', error)
    }

    // 备用：保存到内存（仅用于开发/演示）
    this.letters.set(letter.link_id, letter)
    console.log('Letter saved to memory storage:', letter.link_id)
    return letter
  }

  // 从备用存储获取Letter
  async getLetter(linkId: string): Promise<Letter | null> {
    // 在浏览器环境中，尝试通过API获取
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/letters/${linkId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('Letter found via API:', linkId)
          return data
        }
      } catch (error) {
        console.warn('API fetch failed:', error)
      }
    }

    // 服务器端：尝试从Vercel KV获取
    try {
      if (typeof process !== 'undefined' && process.env.KV_REST_API_URL) {
        const response = await fetch(`${process.env.KV_REST_API_URL}/get/${linkId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.result) {
            console.log('Letter found in Vercel KV:', linkId)
            return JSON.parse(data.result)
          }
        }
      }
    } catch (error) {
      console.warn('Vercel KV fetch failed:', error)
    }

    // 备用：从内存获取
    const letter = this.letters.get(linkId)
    if (letter) {
      console.log('Letter found in memory storage:', linkId)
      return letter
    }

    console.log('Letter not found in fallback storage:', linkId)
    return null
  }

  // 获取用户的Letters
  async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    const allLetters = Array.from(this.letters.values())
    
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

export const fallbackStorage = FallbackStorage.getInstance()