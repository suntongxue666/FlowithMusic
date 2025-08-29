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

  // 强制清除所有用户登录状态（调试用）
  forceSignOut(): void {
    console.log('🚪 强制退出登录，清除所有用户数据...')
    
    if (typeof window !== 'undefined') {
      // 清除所有用户相关的localStorage数据
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('anonymous_id')
      localStorage.removeItem('supabase_auth_error')
      localStorage.removeItem('letters_recovered')
      
      // 清除Supabase会话数据
      const supabaseKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) {
          supabaseKeys.push(key)
        }
      }
      supabaseKeys.forEach(key => localStorage.removeItem(key))
      
      console.log('🧹 已清除localStorage中的用户数据')
    }
    
    // 重置内存中的用户状态
    this.currentUser = null
    this.anonymousId = null
    
    // 如果有Supabase，也清除其会话
    if (supabase) {
      supabase.auth.signOut().catch(error => {
        console.warn('Supabase signOut failed:', error)
      })
    }
    
    console.log('✅ 强制退出完成')
  }

  // Google OAuth 登录
  async signInWithGoogle(): Promise<void> {
    // 清除认证错误标记，准备重新尝试
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_auth_error')
      console.log('🔑 开始Google登录，已清除认证错误标记')
    }
    
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

  // 登录成功后的数据处理（优化版 - 依赖数据库触发器）
  async handleAuthCallback(user: any): Promise<User> {
    console.log('🔄 UserService: 开始处理登录回调...')
    console.log('👤 UserService: 用户信息:', { 
      id: user.id, 
      email: user.email,
      metadata: user.user_metadata 
    })
    
    if (!supabase) {
      console.warn('⚠️ UserService: Supabase不可用，使用fallback处理')
      return this.createFallbackUser(user)
    }

    // 获取当前匿名ID用于数据迁移
    const anonymousId = this.anonymousId || localStorage.getItem('anonymous_id')
    console.log('🔍 UserService: 当前匿名ID:', anonymousId)
    
    try {
      // 查找通过触发器创建的用户记录 - 优化重试逻辑
      console.log('🔍 UserService: 查询用户记录...')
      let existingUser
      
      // 重试机制，触发器可能需要时间 - 优化超时处理
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔍 UserService: 第${attempt}次查询用户记录...`)
          
          // 为每次查询设置超时
          const queryPromise = supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('查询超时')), 5000)
          )
          
          const result = await Promise.race([queryPromise, timeoutPromise]) as any
          const { data, error } = result
            
          if (error && error.code !== 'PGRST116') {
            // PGRST116 是 "not found" 错误，其他错误需要处理
            console.warn(`⚠️ UserService: 查询错误:`, error)
          }
          
          if (data) {
            existingUser = data
            console.log(`✅ UserService: 第${attempt}次尝试成功，找到用户记录:`, {
              email: data.email,
              display_name: data.display_name,
              avatar_url: data.avatar_url
            })
            break
          }
          
          if (attempt < 3) {
            console.log(`⏳ UserService: 第${attempt}次未找到，等待${attempt * 1000}ms后重试...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          }
        } catch (queryError) {
          console.warn(`⚠️ UserService: 第${attempt}次查询异常:`, queryError)
          if (attempt === 3) {
            console.log('⚠️ UserService: 所有查询尝试都失败，跳过查询直接创建用户')
            break
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      let finalUser: User

      if (existingUser) {
        console.log('✅ UserService: 找到触发器创建的用户记录')
        finalUser = existingUser
      } else {
        console.log('⚠️ UserService: 触发器未创建用户记录，尝试手动创建')
        
        // 生成匿名ID
        const newAnonymousId = anonymousId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        
        try {
          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              google_id: user.id,
              anonymous_id: newAnonymousId,
              display_name: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || user.email?.split('@')[0],
              avatar_url: (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture,
              user_agent: getUserAgent(),
              social_media_info: user.user_metadata || {},
              coins: 100,
              is_premium: false
            })
            .select()
            .single()

          if (createError) {
            console.error('❌ UserService: 手动创建用户失败:', createError)
            
            // 如果是唯一约束冲突，尝试再次查询
            if (createError.code === '23505') {
              console.log('🔄 UserService: 用户已存在，重新查询...')
              const { data: retryUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()
              
              if (retryUser) {
                finalUser = retryUser
              } else {
                throw createError
              }
            } else {
              throw createError
            }
          } else {
            finalUser = createdUser
            console.log('✅ UserService: 手动创建用户成功')
          }
        } catch (createError) {
          console.warn('⚠️ UserService: 所有创建方法都失败，使用临时用户:', createError)
          return this.createFallbackUser(user)
        }
      }

      // 处理匿名Letter的迁移
      if (anonymousId && finalUser.id) {
        try {
          console.log('🔄 UserService: 开始迁移匿名数据...')
          await this.migrateAnonymousLetters(anonymousId, finalUser)
        } catch (migrateError) {
          console.warn('⚠️ UserService: 数据迁移失败，但用户登录成功:', migrateError)
        }
      }

      // 更新本地状态
      this.currentUser = finalUser
      this.anonymousId = finalUser.anonymous_id
      
      // 强制保存到localStorage - 确保数据持久化
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(finalUser))
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('anonymous_id', finalUser.anonymous_id || '')
          
          console.log('💾 UserService: 用户数据已保存到localStorage:', {
            email: finalUser.email,
            display_name: finalUser.display_name,
            has_avatar: !!finalUser.avatar_url
          })
        } catch (saveError) {
          console.error('❌ UserService: localStorage保存失败:', saveError)
        }
      }
      
      console.log('✅ UserService: 用户处理完成:', {
        id: finalUser.id,
        email: finalUser.email,
        display_name: finalUser.display_name,
        avatar_url: finalUser.avatar_url,
        anonymous_id: finalUser.anonymous_id,
        创建方式: existingUser ? '触发器自动创建' : '手动创建',
        数据完整性: {
          有邮箱: !!finalUser.email,
          有显示名: !!finalUser.display_name,
          有头像: !!finalUser.avatar_url,
          有匿名ID: !!finalUser.anonymous_id
        }
      })
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
      display_name: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || user.email?.split('@')[0],
      avatar_url: (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      coins: 100,
      is_premium: false,
      user_agent: getUserAgent()
    }
    
    this.currentUser = fallbackUser
    
    // 强制保存到localStorage - 确保fallback用户也能持久化
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('user', JSON.stringify(fallbackUser))
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('anonymous_id', fallbackUser.anonymous_id)
        
        // 验证保存是否成功
        const savedUser = localStorage.getItem('user')
        console.log('💾 Fallback用户数据保存验证:', {
          saved: !!savedUser,
          userEmail: JSON.parse(savedUser || '{}').email,
          avatar: JSON.parse(savedUser || '{}').avatar_url
        })
      } catch (saveError) {
        console.error('❌ UserService: Fallback用户保存失败:', saveError)
      }
    }
    
    console.log('✅ UserService: Fallback用户创建成功')
    return fallbackUser
  }

  // 迁移匿名Letters
  private async migrateAnonymousLetters(anonymousId: string | null, user: User): Promise<void> {
    if (!anonymousId || !user?.id) {
      console.log('⏭️ UserService: 无需迁移Letter - anonymousId或user.id为空:', { anonymousId, userId: user?.id })
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
    console.log('🚪 UserService: 开始用户登出...')
    
    // 立即清除内存状态
    this.currentUser = null
    
    // 清理localStorage中的用户数据
    if (typeof window !== 'undefined') {
      console.log('🧹 清理localStorage用户数据...')
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('supabase_auth_error')
      
      // 清除所有Supabase会话数据
      const supabaseKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-')) {
          supabaseKeys.push(key)
        }
      }
      supabaseKeys.forEach(key => localStorage.removeItem(key))
      
      console.log(`🧹 已清除 ${supabaseKeys.length + 3} 个localStorage项目`)
    }
    
    // 尝试清除Supabase会话（异步，不阻塞）
    if (supabase) {
      try {
        await supabase.auth.signOut()
        console.log('✅ Supabase登出成功')
      } catch (error) {
        console.warn('⚠️ Supabase登出失败（但本地状态已清除）:', error)
      }
    }
    
    console.log('✅ UserService: 用户登出完成（本地状态已清除）')
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    // 首先检查内存中的用户状态
    if (this.currentUser && this.currentUser.email) {
      console.log('🎯 从内存获取用户:', this.currentUser.email)
      return this.currentUser
    } else if (this.currentUser && !this.currentUser.email) {
      console.warn('⚠️ 内存中用户数据不完整，清除并重新获取')
      this.currentUser = null
    }
    
    // 从localStorage获取
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user')
        const isAuth = localStorage.getItem('isAuthenticated')
        
        if (userData && isAuth === 'true') {
          const user = JSON.parse(userData)
          
          // 验证用户数据完整性 - 更严格的检查
          if (user && user.id && user.email && typeof user.email === 'string' && user.email.includes('@')) {
            console.log('📱 从localStorage恢复用户:', {
              email: user.email,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              有头像: !!user.avatar_url,
              用户ID: user.id
            })
            
            this.currentUser = user
            return user
          } else {
            console.warn('⚠️ localStorage中的用户数据不完整或损坏:', {
              hasId: !!user?.id,
              hasEmail: !!user?.email,
              emailValid: user?.email && typeof user.email === 'string' && user.email.includes('@'),
              user: user
            })
            
            // 清理损坏的数据
            localStorage.removeItem('user')
            localStorage.removeItem('isAuthenticated')
            this.currentUser = null
          }
        } else {
          console.log('📱 localStorage中无有效用户数据')
        }
      } catch (error) {
        console.error('❌ 解析localStorage用户数据失败:', error)
        // 清理损坏的数据
        localStorage.removeItem('user')
        localStorage.removeItem('isAuthenticated')
        this.currentUser = null
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
    // 首先检查是否有有效的用户数据
    const currentUser = this.getCurrentUser()
    if (currentUser && currentUser.email) {
      return true
    }
    
    // 如果没有有效用户但localStorage标记为已认证，清理状态
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('isAuthenticated')
      if (isAuth === 'true' && !currentUser) {
        console.warn('⚠️ 认证状态不一致，清理状态')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('user')
      }
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