// 简单的存储解决方案，使用GitHub Gist作为数据库
import { Letter } from './supabase'

class SimpleStorage {
  private static instance: SimpleStorage
  private letters: Map<string, Letter> = new Map()

  static getInstance(): SimpleStorage {
    if (!SimpleStorage.instance) {
      SimpleStorage.instance = new SimpleStorage()
    }
    return SimpleStorage.instance
  }

  // 保存Letter到简单存储
  async saveLetter(letter: Letter): Promise<Letter> {
    try {
      // 保存到服务器内存（通过API）
      const response = await fetch(`/api/simple-storage/${letter.link_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letter)
      })

      if (response.ok) {
        console.log('Letter saved to simple storage:', letter.link_id)
        return letter
      } else {
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Simple storage save failed:', error)
      // 备用：保存到本地内存
      this.letters.set(letter.link_id, letter)
      return letter
    }
  }

  // 从简单存储获取Letter
  async getLetter(linkId: string): Promise<Letter | null> {
    try {
      // 从服务器获取
      const response = await fetch(`/api/simple-storage/${linkId}`)
      
      if (response.ok) {
        const letter = await response.json()
        console.log('Letter found in simple storage:', linkId)
        return letter
      } else if (response.status === 404) {
        console.log('Letter not found in simple storage:', linkId)
        return null
      } else {
        throw new Error(`Failed to fetch: ${response.status}`)
      }
    } catch (error) {
      console.error('Simple storage fetch failed:', error)
      // 备用：从本地内存获取
      const letter = this.letters.get(linkId)
      return letter || null
    }
  }

  // 获取用户的Letters
  async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    try {
      const response = await fetch(`/api/simple-storage/user?userId=${userId || ''}&anonymousId=${anonymousId || ''}`)
      
      if (response.ok) {
        const letters = await response.json()
        return letters
      } else {
        throw new Error(`Failed to fetch user letters: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch user letters:', error)
      // 备用：从本地内存获取
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
}

export const simpleStorage = SimpleStorage.getInstance()