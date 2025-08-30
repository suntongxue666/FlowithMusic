// 简化的用户状态管理工具
// 专门处理用户状态的快速获取和缓存

import { User } from './supabase'

export class UserStateManager {
  private static instance: UserStateManager
  private cachedUser: User | null = null
  private lastCacheTime: number = 0
  private readonly CACHE_DURATION = 30000 // 30秒缓存

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager()
    }
    return UserStateManager.instance
  }

  // 快速获取用户状态（优先使用缓存）
  getQuickUserState(): { user: User | null; isAuthenticated: boolean } {
    // 1. 检查内存缓存是否有效
    const now = Date.now()
    if (this.cachedUser && (now - this.lastCacheTime) < this.CACHE_DURATION) {
      return {
        user: this.cachedUser,
        isAuthenticated: true
      }
    }

    // 2. 从localStorage获取
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user')
        const storedAuth = localStorage.getItem('isAuthenticated')
        
        if (storedUser && storedAuth === 'true') {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser && parsedUser.email) {
            // 更新缓存
            this.cachedUser = parsedUser
            this.lastCacheTime = now
            
            return {
              user: parsedUser,
              isAuthenticated: true
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ UserStateManager: localStorage解析失败:', error)
      }
    }

    return {
      user: null,
      isAuthenticated: false
    }
  }

  // 更新用户状态缓存
  updateUserCache(user: User | null): void {
    this.cachedUser = user
    this.lastCacheTime = Date.now()
    
    // 同时更新localStorage
    if (typeof window !== 'undefined') {
      try {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
          localStorage.setItem('isAuthenticated', 'true')
        } else {
          localStorage.removeItem('user')
          localStorage.removeItem('isAuthenticated')
        }
      } catch (error) {
        console.warn('⚠️ UserStateManager: localStorage更新失败:', error)
      }
    }
  }

  // 清除用户状态缓存
  clearUserCache(): void {
    this.cachedUser = null
    this.lastCacheTime = 0
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
    }
  }

  // 检查缓存是否过期
  isCacheExpired(): boolean {
    const now = Date.now()
    return (now - this.lastCacheTime) >= this.CACHE_DURATION
  }
}

// 导出单例实例
export const userStateManager = UserStateManager.getInstance()