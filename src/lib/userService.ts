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
      // 获取当前域名和协议（生产环境使用动态获取）
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.flowithmusic.com'
      const redirectUri = `${origin}/auth/callback`
      
      console.log('🔗 开始Google OAuth登录...')
      console.log('🔗 重定向URI:', redirectUri)
      console.log('🔗 确保此URI已在Google Cloud Console中配置')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false
        }
      })
      
      console.log('🔗 OAuth响应:', data)
      
      if (error) {
        console.error('❌ Google OAuth错误:', error)
        throw new Error(`登录失败: ${error.message}`)
      }
      
      console.log('✅ OAuth请求已发送，等待重定向...')
    } catch (error) {
      console.error('💥 登录错误:', error)
      throw error
    }
  }

  // 登录成功后的数据迁移
  async handleAuthCallback(user: any): Promise<User> {
    console.log('🔄 UserService: 开始处理登录回调...')
    console.log('👤 UserService: 用户信息:', { id: user.id, email: user.email })
    
    if (!supabase) {
      console.warn('⚠️ UserService: Supabase不可用，使用fallback处理')
      return this.createFallbackUser(user)
    }

    // 获取当前匿名ID
    const anonymousId = this.anonymousId || localStorage.getItem('anonymous_id')
    console.log('🔍 UserService: 当前匿名ID:', anonymousId)
    
    try {
      // 验证当前会话
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        console.error('❌ UserService: 无有效会话')
        throw new Error('无有效认证会话')
      }
      
      console.log('✅ UserService: 有效会话已确认')
      
      // 检查用户是否已存在
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', user.id)
        .single()

      let finalUser: User

      if (existingUser) {
        console.log('✅ UserService: 用户已存在，更新信息')
        
        // 更新现有用户信息
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            email: user.email,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            updated_at: new Date().toISOString(),
            user_agent: getUserAgent()
          })
          .eq('google_id', user.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ UserService: 更新用户失败:', updateError)
          throw new Error(`更新用户信息失败: ${updateError.message}`)
        }

        finalUser = updatedUser
      } else {
        console.log('🆕 UserService: 创建新用户')
        
        // 创建新用户
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            google_id: user.id,
            anonymous_id: anonymousId || generateAnonymousId(),
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            user_agent: getUserAgent(),
            coins: 100,
            is_premium: false
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ UserService: 创建用户失败:', createError)
          throw new Error(`创建用户失败: ${createError.message}`)
        }

        finalUser = newUser
      }

      // 处理匿名Letter的迁移
      await this.migrateAnonymousLetters(anonymousId, finalUser)

      // 更新本地状态
      this.currentUser = finalUser
      this.anonymousId = finalUser.anonymous_id
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(finalUser))
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('anonymous_id', finalUser.anonymous_id)
      }
      
      console.log('✅ UserService: 用户处理完成:', finalUser)
      return finalUser
      
    } catch (error) {
      console.error('💥 UserService: 处理登录回调失败:', error)
      console.log('🔄 UserService: 使用fallback处理')
      return this.createFallbackUser(user)
    }
  }

  // 创建fallback用户
  private createFallbackUser(user: any): User {
    console.log('🔄 UserService: 创建fallback用户')
    const fallbackUser = {
      id: user.id,
      email: user.email,
      google_id: user.id,
      anonymous_id: this.anonymousId || generateAnonymousId(),
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      coins: 100,
      is_premium: false,
      user_agent: getUserAgent()
    }
    
    this.currentUser = fallbackUser
    
    // 保存到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(fallbackUser))
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('anonymous_id', fallbackUser.anonymous_id)
    }
    
    console.log('✅ UserService: Fallback用户创建成功')
    return fallbackUser
  }

  // 迁移匿名Letters
  private async migrateAnonymousLetters(anonymousId: string | null, user: User): Promise<void> {
    if (!anonymousId || !user.id) {
      console.log('⏭️ UserService: 无需迁移Letter')
      return
    }

    console.log('🔄 UserService: 开始迁移匿名Letters...')
    
    try {
      // 1. 先从localStorage迁移
      if (typeof window !== 'undefined') {
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const anonymousLetters = localLetters.filter((letter: any) => 
          letter.anonymous_id === anonymousId && !letter.user_id
        )
        
        if (anonymousLetters.length > 0) {
          console.log(`🔄 UserService: 迁移${anonymousLetters.length}个localStorage中的匿名Letter`)
          
          // 更新localStorage中的Letter归属
          const updatedLetters = localLetters.map((letter: any) => {
            if (letter.anonymous_id === anonymousId && !letter.user_id) {
              return { ...letter, user_id: user.id, anonymous_id: null }
            }
            return letter
          })
          
          localStorage.setItem('letters', JSON.stringify(updatedLetters))
          console.log('✅ UserService: localStorage中的Letter迁移完成')
        }
      }

      // 2. 数据库迁移（如果可用）
      if (supabase) {
        try {
          const { data: migrationResult, error: migrationError } = await supabase
            .rpc('migrate_anonymous_letters_to_user', {
              p_user_id: user.id,
              p_anonymous_id: anonymousId
            })

          if (migrationError) {
            console.warn('⚠️ UserService: 数据库Letter迁移失败:', migrationError)
          } else {
            console.log(`✅ UserService: 数据库成功迁移 ${migrationResult || 0} 个Letters`)
          }
        } catch (migrationError) {
          console.warn('⚠️ UserService: 数据库迁移异常:', migrationError)
        }
      }
      
    } catch (error) {
      console.error('💥 UserService: Letter迁移失败:', error)
    }
  }

  // 登出
  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut()
    }
    this.currentUser = null
    
    // 清理localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
    }
    
    // 保留匿名ID以便下次使用
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser
    }
    
    // 从localStorage获取
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const user = JSON.parse(userData)
          this.currentUser = user
          return user
        }
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error)
      }
    }
    
    return null
  }

  // 获取匿名ID
  getAnonymousId(): string | null {
    return this.anonymousId || localStorage.getItem('anonymous_id')
  }

  // 检查是否已登录
  isAuthenticated(): boolean {
    if (this.currentUser !== null) {
      return true
    }
    
    // 从localStorage检查
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('isAuthenticated')
      const userData = localStorage.getItem('user')
      return isAuth === 'true' && userData !== null
    }
    
    return false
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