import { supabase, User, AnonymousSession } from './supabase'
import { ImprovedUserIdentity } from './improvedUserIdentity'

// 生成匿名ID
export function generateAnonymousId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 8)
  return `anon_${timestamp}_${random}`
}

// 获取用户Agent信息
export function getUserAgent(): string {
  if (typeof window !== 'undefined') {
    return navigator.userAgent
  }
  return 'Unknown'
}

// 用户管理服务
export class UserService {
  private static instance: UserService
  private currentUser: User | null = null
  private anonymousId: string | null = null

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // 初始化用户会话
  async initializeUser(): Promise<string> {
    // 使用改进的用户身份识别
    const identity = ImprovedUserIdentity.getOrCreateIdentity()
    this.anonymousId = identity.id
    
    // 兼容性：同时在旧的localStorage key中保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('anonymous_id', identity.id)
    }

    // 检查Supabase是否可用
    if (!supabase) {
      console.log('🔄 Supabase not available, using improved identity:', identity.id)
      return identity.id
    }

    try {
      // 检查是否有已登录用户
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 已登录用户
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', user.id)
          .single()
        
        if (userData) {
          this.currentUser = userData
          this.anonymousId = userData.anonymous_id
          return userData.anonymous_id
        }
      }

      // 匿名用户处理 - 记录匿名会话
      try {
        await supabase.from('anonymous_sessions').insert({
          anonymous_id: identity.id,
          user_agent: identity.deviceInfo.userAgent,
          device_fingerprint: identity.fingerprint
        })
      } catch (error) {
        console.warn('Failed to record anonymous session:', error)
      }

      return identity.id
    } catch (error) {
      console.error('Error initializing user:', error)
      return identity.id
    }
  }

  // Google OAuth 登录
  async signInWithGoogle(): Promise<void> {
    if (!supabase) {
      throw new Error('登录功能暂时不可用')
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        console.error('Google OAuth error:', error)
        throw new Error(`登录失败: ${error.message}`)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // 登录成功后的数据迁移
  async handleAuthCallback(user: any): Promise<User> {
    if (!supabase) {
      throw new Error('数据库连接不可用')
    }

    const anonymousId = this.anonymousId || localStorage.getItem('anonymous_id')
    
    // 检查用户是否已存在
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', user.id)
      .single()

    if (!existingUser) {
      // 创建新用户
      const newUser = {
        email: user.email,
        google_id: user.id,
        anonymous_id: anonymousId || generateAnonymousId(),
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        user_agent: getUserAgent(),
        coins: 100, // 新用户赠送100金币
        is_premium: false
      }

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (error) throw error
      existingUser = data
    }

    // 数据迁移：将匿名Letter关联到正式用户
    if (anonymousId) {
      await supabase
        .from('letters')
        .update({ 
          user_id: existingUser.id,
          anonymous_id: null 
        })
        .eq('anonymous_id', anonymousId)

      // 更新匿名会话关联
      await supabase
        .from('anonymous_sessions')
        .update({ linked_user_id: existingUser.id })
        .eq('anonymous_id', anonymousId)
    }

    this.currentUser = existingUser
    return existingUser
  }

  // 登出
  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut()
    }
    this.currentUser = null
    // 保留匿名ID以便下次使用
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    return this.currentUser
  }

  // 获取匿名ID
  getAnonymousId(): string | null {
    return this.anonymousId || localStorage.getItem('anonymous_id')
  }

  // 检查是否已登录
  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  // 更新用户资料
  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!supabase) {
      throw new Error('数据库连接不可用')
    }

    if (!this.currentUser) {
      throw new Error('用户未登录')
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', this.currentUser.id)
      .select()
      .single()

    if (error) throw error
    
    this.currentUser = data
    return data
  }

  // 获取用户统计信息
  async getUserStats(userId: string): Promise<{
    letterCount: number
    totalViews: number
    joinDate: string
  }> {
    if (!supabase) {
      console.warn('数据库连接不可用')
      return {
        letterCount: 0,
        totalViews: 0,
        joinDate: this.currentUser?.created_at || ''
      }
    }

    const { data: letters } = await supabase
      .from('letters')
      .select('view_count, created_at')
      .eq('user_id', userId)

    const letterCount = letters?.length || 0
    const totalViews = letters?.reduce((sum, letter) => sum + letter.view_count, 0) || 0
    const joinDate = this.currentUser?.created_at || ''

    return {
      letterCount,
      totalViews,
      joinDate
    }
  }
}

// 导出单例实例
export const userService = UserService.getInstance()