// 匿名用户服务
export interface AnonymousUser {
  id: string
  display_name: string
  avatar_emoji: string
  avatar_background: string
  city?: string
  ip?: string
  created_at: string
}

// 动物emoji列表
const ANIMAL_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
  '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧',
  '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄',
  '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮',
  '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️'
]

// 浅色背景色列表
const LIGHT_BACKGROUNDS = [
  '#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF5E5', '#F0E5FF',
  '#FFE5F5', '#E5FFFF', '#F5FFE5', '#FFE5F0', '#E5F0FF',
  '#F0FFE5', '#FFE5E0', '#E0FFE5', '#E5E0FF', '#FFE0E5',
  '#E5FFE0', '#E0E5FF', '#FFE0F0', '#F0E0FF', '#E0F0FF'
]

export class AnonymousUserService {
  private static readonly STORAGE_KEY = 'anonymous_user'
  
  // 生成8位随机数字ID
  private static generateId(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString()
  }
  
  // 随机选择动物emoji
  private static getRandomAnimalEmoji(): string {
    return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)]
  }
  
  // 随机选择浅色背景
  private static getRandomLightBackground(): string {
    return LIGHT_BACKGROUNDS[Math.floor(Math.random() * LIGHT_BACKGROUNDS.length)]
  }
  
  // 获取用户IP地址对应的城市（简化版本）
  private static async getCityFromIP(): Promise<string> {
    try {
      // 使用免费的IP地理位置API
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      return data.city || 'Unknown'
    } catch (error) {
      console.warn('无法获取城市信息:', error)
      return 'Unknown'
    }
  }
  
  // 创建新的匿名用户
  public static async createAnonymousUser(): Promise<AnonymousUser> {
    const id = this.generateId()
    const city = await this.getCityFromIP()
    
    const user: AnonymousUser = {
      id,
      display_name: `Guest${id}`,
      avatar_emoji: this.getRandomAnimalEmoji(),
      avatar_background: this.getRandomLightBackground(),
      city,
      created_at: new Date().toISOString()
    }
    
    // 保存到localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
    
    return user
  }
  
  // 获取或创建匿名用户
  public static async getOrCreateAnonymousUser(): Promise<AnonymousUser> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const user = JSON.parse(stored) as AnonymousUser
        // 验证用户数据完整性
        if (user.id && user.display_name && user.avatar_emoji) {
          return user
        }
      }
    } catch (error) {
      console.warn('读取匿名用户数据失败:', error)
    }
    
    // 创建新用户
    return await this.createAnonymousUser()
  }
  
  // 获取当前匿名用户
  public static getCurrentAnonymousUser(): AnonymousUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as AnonymousUser
      }
    } catch (error) {
      console.warn('读取匿名用户数据失败:', error)
    }
    return null
  }
  
  // 清除匿名用户数据
  public static clearAnonymousUser(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }
  
  // 生成头像组件的props
  public static getAvatarProps(user: AnonymousUser) {
    return {
      emoji: user.avatar_emoji,
      background: user.avatar_background,
      displayName: user.display_name
    }
  }
}