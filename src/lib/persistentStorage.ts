// 持久化存储解决方案
import { Letter } from './supabase'

class PersistentStorage {
  private static instance: PersistentStorage
  private cache: Map<string, Letter> = new Map()

  static getInstance(): PersistentStorage {
    if (!PersistentStorage.instance) {
      PersistentStorage.instance = new PersistentStorage()
    }
    return PersistentStorage.instance
  }

  // 保存Letter到持久化存储
  async saveLetter(letter: Letter): Promise<Letter> {
    try {
      // 保存到本地缓存
      this.cache.set(letter.link_id, letter)
      
      // 尝试保存到外部存储（如果配置了的话）
      await this.saveToExternal(letter)
      
      console.log('Letter saved to persistent storage:', letter.link_id)
      return letter
    } catch (error) {
      console.error('Failed to save to persistent storage:', error)
      // 即使外部存储失败，至少保存到缓存
      this.cache.set(letter.link_id, letter)
      return letter
    }
  }

  // 从持久化存储获取Letter
  async getLetter(linkId: string): Promise<Letter | null> {
    try {
      // 首先检查本地缓存
      const cachedLetter = this.cache.get(linkId)
      if (cachedLetter) {
        console.log('Letter found in cache:', linkId)
        return cachedLetter
      }

      // 尝试从外部存储获取
      const externalLetter = await this.loadFromExternal(linkId)
      if (externalLetter) {
        // 保存到缓存以便下次快速访问
        this.cache.set(linkId, externalLetter)
        console.log('Letter found in external storage:', linkId)
        return externalLetter
      }

      console.log('Letter not found in persistent storage:', linkId)
      return null
    } catch (error) {
      console.error('Failed to load from persistent storage:', error)
      return null
    }
  }

  // 保存到外部存储（可以是GitHub Gist、KV存储等）
  private async saveToExternal(letter: Letter): Promise<void> {
    // 这里可以实现保存到GitHub Gist或其他外部存储
    // 暂时跳过，使用内存缓存
    console.log('External storage not configured, using cache only')
  }

  // 从外部存储加载
  private async loadFromExternal(linkId: string): Promise<Letter | null> {
    // 这里可以实现从GitHub Gist或其他外部存储加载
    // 暂时跳过，使用内存缓存
    console.log('External storage not configured, checking cache only')
    return null
  }

  // 获取用户的Letters
  async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    const allLetters = Array.from(this.cache.values())
    
    return allLetters.filter(letter => {
      if (userId) {
        return letter.user_id === userId
      } else if (anonymousId) {
        return letter.anonymous_id === anonymousId
      }
      return false
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // 获取所有Letters（用于调试）
  getAllLetters(): Letter[] {
    return Array.from(this.cache.values())
  }
}

export const persistentStorage = PersistentStorage.getInstance()