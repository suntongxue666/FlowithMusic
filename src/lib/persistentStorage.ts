// 简单的客户端存储解决方案
import { Letter } from './supabase'

class PersistentStorage {
  private static instance: PersistentStorage

  static getInstance(): PersistentStorage {
    if (!PersistentStorage.instance) {
      PersistentStorage.instance = new PersistentStorage()
    }
    return PersistentStorage.instance
  }

  // 保存Letter到localStorage
  async saveLetter(letter: Letter): Promise<Letter> {
    try {
      if (typeof window !== 'undefined') {
        const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        existingLetters.push(letter)
        localStorage.setItem('letters', JSON.stringify(existingLetters))
        console.log('Letter saved to localStorage:', letter.link_id)
      }
      return letter
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return letter
    }
  }

  // 从localStorage获取Letter
  async getLetter(linkId: string): Promise<Letter | null> {
    try {
      if (typeof window !== 'undefined') {
        const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const letter = existingLetters.find((l: Letter) => l.link_id === linkId)
        if (letter) {
          console.log('Letter found in localStorage:', linkId)
          return letter
        }
      }
      return null
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return null
    }
  }

  // 获取用户的Letters
  async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    try {
      if (typeof window === 'undefined') return []
      
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      return existingLetters.filter((letter: Letter) => {
        if (userId) {
          return letter.user_id === userId
        } else if (anonymousId) {
          return letter.anonymous_id === anonymousId
        }
        return false
      }).sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Failed to get user letters from localStorage:', error)
      return []
    }
  }

  // 获取所有Letters（用于调试）
  getAllLetters(): Letter[] {
    try {
      if (typeof window === 'undefined') return []
      
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      return existingLetters
    } catch (error) {
      console.error('Failed to get all letters from localStorage:', error)
      return []
    }
  }
}

export const persistentStorage = PersistentStorage.getInstance()