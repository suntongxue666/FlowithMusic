// 改进的匿名用户身份管理
export interface AnonymousIdentity {
  id: string
  fingerprint: string
  createdAt: string
  lastSeen: string
  deviceInfo: {
    userAgent: string
    language: string
    timezone: number
    screen: string
  }
}

export class ImprovedUserIdentity {
  private static STORAGE_KEY = 'user_identity'
  private static BACKUP_STORAGE_KEY = 'user_identity_backup'

  // 生成设备指纹
  static generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server'
    
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || '',
        navigator.maxTouchPoints?.toString() || '0'
      ]
      
      // 简单hash函数
      let hash = 0
      const str = components.join('|')
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      
      return Math.abs(hash).toString(36)
    } catch (error) {
      console.warn('Failed to generate device fingerprint:', error)
      return Math.random().toString(36).substring(2)
    }
  }

  // 生成匿名ID
  static generateAnonymousId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `anon_${timestamp}_${random}`
  }

  // 获取或创建用户身份
  static getOrCreateIdentity(): AnonymousIdentity {
    if (typeof window === 'undefined') {
      // 服务端fallback
      return {
        id: this.generateAnonymousId(),
        fingerprint: 'server',
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        deviceInfo: {
          userAgent: 'server',
          language: 'en',
          timezone: 0,
          screen: '0x0'
        }
      }
    }

    try {
      // 1. 尝试从localStorage获取
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const identity: AnonymousIdentity = JSON.parse(stored)
        
        // 验证指纹是否匹配（允许一定的变化）
        const currentFingerprint = this.generateDeviceFingerprint()
        if (this.fingerprintSimilarity(identity.fingerprint, currentFingerprint) > 0.8) {
          // 更新最后访问时间
          identity.lastSeen = new Date().toISOString()
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(identity))
          
          console.log('👤 Restored existing user identity:', identity.id)
          return identity
        } else {
          console.log('🔄 Device fingerprint changed significantly, creating new identity')
        }
      }

      // 2. 尝试从备份存储获取
      const backup = localStorage.getItem(this.BACKUP_STORAGE_KEY)
      if (backup) {
        const backupIdentity: AnonymousIdentity = JSON.parse(backup)
        const currentFingerprint = this.generateDeviceFingerprint()
        if (this.fingerprintSimilarity(backupIdentity.fingerprint, currentFingerprint) > 0.7) {
          // 从备份恢复
          localStorage.setItem(this.STORAGE_KEY, backup)
          console.log('🔄 Restored identity from backup:', backupIdentity.id)
          return backupIdentity
        }
      }

      // 3. 创建新身份
      const newIdentity: AnonymousIdentity = {
        id: this.generateAnonymousId(),
        fingerprint: this.generateDeviceFingerprint(),
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: new Date().getTimezoneOffset(),
          screen: `${screen.width}x${screen.height}`
        }
      }

      // 保存到主存储和备份存储
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newIdentity))
      localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(newIdentity))
      
      console.log('✨ Created new user identity:', newIdentity.id)
      return newIdentity

    } catch (error) {
      console.error('Failed to get/create user identity:', error)
      
      // Fallback: 最基本的身份
      return {
        id: this.generateAnonymousId(),
        fingerprint: 'fallback',
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent || 'unknown',
          language: navigator.language || 'en',
          timezone: 0,
          screen: '0x0'
        }
      }
    }
  }

  // 计算指纹相似度
  private static fingerprintSimilarity(fp1: string, fp2: string): number {
    if (fp1 === fp2) return 1
    if (!fp1 || !fp2) return 0
    
    // 简单的字符串相似度计算
    const maxLen = Math.max(fp1.length, fp2.length)
    const minLen = Math.min(fp1.length, fp2.length)
    
    let matches = 0
    for (let i = 0; i < minLen; i++) {
      if (fp1[i] === fp2[i]) matches++
    }
    
    return matches / maxLen
  }

  // 检查用户是否可能更换了设备
  static detectDeviceChange(): { 
    isLikelyDeviceChange: boolean
    suggestion: string 
  } {
    if (typeof window === 'undefined') {
      return { isLikelyDeviceChange: false, suggestion: '' }
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return { isLikelyDeviceChange: false, suggestion: '' }
      }

      const identity: AnonymousIdentity = JSON.parse(stored)
      const currentFingerprint = this.generateDeviceFingerprint()
      const similarity = this.fingerprintSimilarity(identity.fingerprint, currentFingerprint)

      if (similarity < 0.5) {
        return {
          isLikelyDeviceChange: true,
          suggestion: '检测到您可能更换了设备或浏览器。为了保留您的音乐信息，建议您登录账户。'
        }
      }

      // 检查时间间隔
      const lastSeen = new Date(identity.lastSeen)
      const daysSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceLastSeen > 30) {
        return {
          isLikelyDeviceChange: false,
          suggestion: '很久没有看到您了！为了保留您的音乐收藏，建议您登录账户。'
        }
      }

      return { isLikelyDeviceChange: false, suggestion: '' }

    } catch (error) {
      console.error('Failed to detect device change:', error)
      return { isLikelyDeviceChange: false, suggestion: '' }
    }
  }

  // 清理旧的身份数据（数据迁移时使用）
  static clearOldIdentity(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('anonymous_id') // 旧的存储key
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.BACKUP_STORAGE_KEY)
    }
  }
}