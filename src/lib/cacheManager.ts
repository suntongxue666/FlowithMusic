// 本地缓存管理工具
class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // 设置缓存，ttl单位为毫秒
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    
    // 同时保存到localStorage作为持久化缓存
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error)
    }
  }

  // 获取缓存
  get(key: string): any | null {
    // 先从内存缓存获取
    const memoryCache = this.cache.get(key)
    if (memoryCache && Date.now() - memoryCache.timestamp < memoryCache.ttl) {
      return memoryCache.data
    }

    // 内存缓存失效，尝试从localStorage获取
    try {
      const stored = localStorage.getItem(`cache_${key}`)
      if (stored) {
        const cacheData = JSON.parse(stored)
        if (Date.now() - cacheData.timestamp < cacheData.ttl) {
          // 恢复到内存缓存
          this.cache.set(key, cacheData)
          return cacheData.data
        } else {
          // localStorage中的缓存也已过期，清除
          localStorage.removeItem(`cache_${key}`)
        }
      }
    } catch (error) {
      console.warn('Failed to read cache from localStorage:', error)
    }

    // 缓存不存在或已过期
    this.cache.delete(key)
    return null
  }

  // 检查缓存是否存在且有效
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // 清除特定缓存
  delete(key: string): void {
    this.cache.delete(key)
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn('Failed to remove cache from localStorage:', error)
    }
  }

  // 根据模式清除缓存
  clearByPattern(pattern: string): void {
    // 清除内存缓存
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
    })

    // 清除localStorage缓存
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_') && key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear pattern cache from localStorage:', error)
    }
  }

  // 清除所有缓存
  clear(): void {
    this.cache.clear()
    // 清除localStorage中的所有缓存
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error)
    }
  }

  // 清除过期缓存
  cleanExpired(): void {
    const now = Date.now()
    
    // 清理内存缓存
    const keysToDelete: string[] = []
    this.cache.forEach((value, key) => {
      if (now - value.timestamp >= value.ttl) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
    })

    // 清理localStorage缓存
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const cacheData = JSON.parse(localStorage.getItem(key) || '{}')
            if (now - cacheData.timestamp >= cacheData.ttl) {
              localStorage.removeItem(key)
            }
          } catch (error) {
            // 无效的缓存数据，直接删除
            localStorage.removeItem(key)
          }
        }
      })
    } catch (error) {
      console.warn('Failed to clean expired localStorage cache:', error)
    }
  }

  // 生成缓存键
  generateKey(prefix: string, params: Record<string, any> = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return paramString ? `${prefix}_${paramString}` : prefix
  }
}

export const cacheManager = CacheManager.getInstance()

// 定期清理过期缓存（每10分钟执行一次）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanExpired()
  }, 10 * 60 * 1000)
}