import { supabase, User, AnonymousSession } from './supabase'

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
    // 检查Supabase是否可用
    if (!supabase) {
      // 如果Supabase不可用，只使用匿名ID
      let anonymousId = localStorage.getItem('anonymous_id')
      if (!anonymousId) {
        anonymousId = generateAnonymousId()
        localStorage.setItem('anonymous_id', anonymousId)
      }
      this.anonymousId = anonymousId
      return anonymousId
    }

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
        return userData.anonymous_id
      }
    }

    // 匿名用户处理
    let anonymousId = localStorage.getItem('anonymous_id')
    
    if (!anonymousId) {
      anonymousId = generateAnonymousId()
      localStorage.setItem('anonymous_id', anonymousId)
      
      // 记录匿名会话
      await supabase.from('anonymous_sessions').insert({
        anonymous_id: anonymousId,
        user_agent: getUserAgent()
      })
    }

    this.anonymousId = anonymousId
    return anonymousId
  }

  // Google OAuth 登录
  async signInWithGoogle(): Promise<void> {
    if (!supabase) {
      throw new Error('登录功能暂时不可用')
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      throw new Error(`登录失败: ${error.message}`)
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
    await supabase.auth.signOut()
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