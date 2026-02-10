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

  // 生成匿名ID - 加强版本，包含更多标识信息
  static generateAnonymousId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    const fingerprint = this.generateDeviceFingerprint().substring(0, 4)
    return `anon_${timestamp}_${fingerprint}_${random}`
  }
  
  // 设置持久化Cookie作为备份标识
  static setCookie(name: string, value: string, days: number = 365) {
    if (typeof document === 'undefined') return
    
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
  }
  
  // 获取Cookie值
  static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  // 获取或创建用户身份 - 加强版，多重备份策略
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
      // 多重身份识别策略：
      // 1. localStorage (主要存储)
      // 2. sessionStorage (会话备份)  
      // 3. cookie (持久化备份)
      // 4. 浏览器指纹验证
      
      let identity: AnonymousIdentity | null = null
      const currentFingerprint = this.generateDeviceFingerprint()
      
      // 策略1：尝试从localStorage获取
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsedIdentity: AnonymousIdentity = JSON.parse(stored)
        
        // 验证指纹匹配度
        if (this.fingerprintSimilarity(parsedIdentity.fingerprint, currentFingerprint) > 0.8) {
          identity = parsedIdentity
          console.log('👤 从localStorage恢复用户身份:', identity.id)
        } else {
          console.log('🔄 localStorage指纹不匹配，继续尝试其他方式')
        }
      }
      
      // 策略2：如果localStorage失败，尝试cookie备份
      if (!identity) {
        const cookieId = this.getCookie('anonymous_user_id')
        const cookieFingerprint = this.getCookie('device_fingerprint')
        
        if (cookieId && cookieFingerprint) {
          if (this.fingerprintSimilarity(cookieFingerprint, currentFingerprint) > 0.7) {
            // 从cookie恢复身份
            identity = {
              id: cookieId,
              fingerprint: currentFingerprint,
              createdAt: this.getCookie('user_created_at') || new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              deviceInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                timezone: new Date().getTimezoneOffset(),
                screen: `${screen.width}x${screen.height}`
              }
            }
            console.log('🍪 从Cookie恢复用户身份:', identity.id)
          }
        }
      }
      
      // 策略3：如果都失败，尝试从备份localStorage获取
      if (!identity) {
        const backup = localStorage.getItem(this.BACKUP_STORAGE_KEY)
        if (backup) {
          const backupIdentity: AnonymousIdentity = JSON.parse(backup)
          if (this.fingerprintSimilarity(backupIdentity.fingerprint, currentFingerprint) > 0.6) {
            identity = backupIdentity
            console.log('🔄 从备份localStorage恢复用户身份:', identity.id)
          }
        }
      }
      
      // 如果找到了身份，更新并保存
      if (identity) {
        identity.lastSeen = new Date().toISOString()
        identity.fingerprint = currentFingerprint // 更新指纹
        
        // 多重保存策略
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(identity))
        localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(identity))
        this.setCookie('anonymous_user_id', identity.id)
        this.setCookie('device_fingerprint', currentFingerprint)
        this.setCookie('user_created_at', identity.createdAt)
        
        return identity
      }
      
      // 策略4：创建新身份
      const newIdentity: AnonymousIdentity = {
        id: this.generateAnonymousId(),
        fingerprint: currentFingerprint,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: new Date().getTimezoneOffset(),
          screen: `${screen.width}x${screen.height}`
        }
      }

      // 多重保存新身份
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newIdentity))
      localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(newIdentity))
      this.setCookie('anonymous_user_id', newIdentity.id)
      this.setCookie('device_fingerprint', currentFingerprint)
      this.setCookie('user_created_at', newIdentity.createdAt)
      
      console.log('✨ 创建新的匿名用户身份:', newIdentity.id)
      return newIdentity

    } catch (error) {
      console.error('Failed to get/create user identity:', error)
      
      // 最终fallback
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