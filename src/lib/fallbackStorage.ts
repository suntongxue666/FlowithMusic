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
      // 在浏览器环境中，通过API保存到服务器内存AND尝试持久化
      if (typeof window !== 'undefined') {
        try {
          // 1. 保存到服务器共享存储
          const response = await fetch(`/api/browser-storage/${letter.link_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(letter)
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('Letter saved via shared storage API:', letter.link_id)
            
            // 2. 同时保存到localStorage作为本地备份
            const localLetters = JSON.parse(localStorage.getItem('shared_letters') || '{}')
            localLetters[letter.link_id] = letter
            localStorage.setItem('shared_letters', JSON.stringify(localLetters))
            console.log('Letter also backed up to shared_letters localStorage')
            
            return data.letter || letter
          }
        } catch (apiError) {
          console.warn('Shared storage API save failed:', apiError)
        }
        
        // 3. 如果API失败，至少保存到本地shared_letters
        try {
          const localLetters = JSON.parse(localStorage.getItem('shared_letters') || '{}')
          localLetters[letter.link_id] = letter
          localStorage.setItem('shared_letters', JSON.stringify(localLetters))
          console.log('Letter saved to local shared_letters as fallback')
        } catch (localError) {
          console.error('Local shared storage failed:', localError)
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
    // 在浏览器环境中，先检查本地shared_letters，然后尝试通过API获取
    if (typeof window !== 'undefined') {
      // 1. 首先检查本地shared_letters
      try {
        const localSharedLetters = JSON.parse(localStorage.getItem('shared_letters') || '{}')
        if (localSharedLetters[linkId]) {
          console.log('Letter found in local shared_letters:', linkId)
          return localSharedLetters[linkId]
        }
      } catch (localError) {
        console.warn('Failed to check local shared_letters:', localError)
      }
      
      // 2. 尝试通过API获取
      try {
        const response = await fetch(`/api/letters/${linkId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('Letter found via API:', linkId)
          
          // 缓存到本地shared_letters
          try {
            const localSharedLetters = JSON.parse(localStorage.getItem('shared_letters') || '{}')
            localSharedLetters[linkId] = data
            localStorage.setItem('shared_letters', JSON.stringify(localSharedLetters))
          } catch (cacheError) {
            console.warn('Failed to cache to local shared_letters:', cacheError)
          }
          
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