import { supabase, User } from './supabase'
import { ImprovedUserIdentity } from './improvedUserIdentity'

// 生成匿名ID
export function generateAnonymousId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 10)
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
        // 已登录用户 - 尝试获取数据库中的完整资料
        const userData = await this.fetchAndCacheUser()

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

  // 简化的数据清理 - 只清理明确的错误格式
  cleanupCorruptedData(): void {
    console.log('🧹 简化数据清理...')

    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsed = JSON.parse(userData)

          // 只清理明确的数组格式错误
          if (Array.isArray(parsed)) {
            console.log('🗑️ 清理数组格式的用户数据')
            localStorage.removeItem('user')
            localStorage.removeItem('isAuthenticated')
            this.currentUser = null
          }
        }
      } catch (error) {
        console.log('🗑️ 清理无效JSON数据')
        localStorage.removeItem('user')
        localStorage.removeItem('isAuthenticated')
        this.currentUser = null
      }
    }

    console.log('✅ 简化清理完成')
  }

  // 清理损坏的Supabase session
  async cleanupCorruptedSession(): Promise<void> {
    console.log('🧹 开始清理损坏的Supabase session...')

    if (!supabase || typeof window === 'undefined') {
      return
    }

    try {
      // 检查当前session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.log('🗑️ Session获取失败，清理所有认证数据:', sessionError)
        await supabase.auth.signOut()
        return
      }

      if (session && session.access_token) {
        // 验证token是否有效
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser()

          if (userError) {
            if (userError.message.includes('invalid claim') ||
              userError.message.includes('missing sub claim') ||
              userError.status === 403) {
              console.log('🗑️ 检测到无效token，清理session:', userError.message)
              await supabase.auth.signOut()

              // 清理相关的localStorage数据
              const supabaseKeys = []
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith('sb-')) {
                  supabaseKeys.push(key)
                }
              }
              supabaseKeys.forEach(key => localStorage.removeItem(key))

              console.log(`🧹 已清理 ${supabaseKeys.length} 个损坏的Supabase session项目`)
            }
          } else if (user) {
            console.log('✅ Session有效，用户:', user.email)
          }
        } catch (tokenError) {
          console.log('🗑️ Token验证异常，清理session:', tokenError)
          await supabase.auth.signOut()
        }
      }
    } catch (error) {
      console.warn('⚠️ Session清理过程中出现异常:', error)
    }

    console.log('✅ Session清理完成')
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

  // 确保用户存在于数据库中（核心修复方法）
  async ensureUserExists(authUser: any): Promise<User> {
    console.log('🔄 UserService: ensureUserExists - 开始确保用户存在:', authUser.id)

    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // 1. 标准化用户数据
    const userId = authUser.id || authUser.sub || authUser.aud
    if (!userId) throw new Error('Invalid user data: missing ID')

    const metadata = authUser.user_metadata || {}
    const email = authUser.email
    const displayName = metadata.full_name || metadata.name || email?.split('@')[0] || 'User'
    const avatarUrl = metadata.avatar_url || metadata.picture

    // 2. 尝试查询现有用户
    try {
      const { data: existingUser, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (existingUser) {
        console.log('✅ UserService: 用户已存在，检查是否需要更新')

        // 检查关键字段是否缺失或过时
        if (!existingUser.email || !existingUser.display_name || existingUser.display_name === 'User') {
          console.log('🔧 UserService: 用户数据不完整，执行更新...')

          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              email: email,
              display_name: displayName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single()

          if (updatedUser && !updateError) {
            return updatedUser
          }
        }

        return existingUser
      }

      // 3. 用户不存在，执行插入
      console.log('➕ UserService: 用户不存在，执行插入...')

      // 获取当前的匿名ID（如果存在），用于关联
      const anonymousId = this.anonymousId || localStorage.getItem('anonymous_id') || generateAnonymousId()

      const newUser = {
        id: userId,
        email: email,
        google_id: userId, // 冗余字段，保持兼容
        anonymous_id: anonymousId,
        display_name: displayName,
        avatar_url: avatarUrl,
        user_agent: getUserAgent(),
        social_media_info: metadata,
        coins: 10,
        is_premium: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (insertError) {
        // 处理并发插入导致的冲突
        if (insertError.code === '23505') { // unique_violation
          console.log('⚠️ UserService: 插入冲突，用户可能刚被创建，重新查询...')
          const { data: retryUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

          if (retryUser) return retryUser
        }

        console.error('❌ UserService: 插入用户失败:', insertError)
        throw insertError
      }

      console.log('✅ UserService: 新用户创建成功')
      return insertedUser

    } catch (error) {
      console.error('💥 UserService: ensureUserExists 异常:', error)
      throw error
    }
  }

  // 登录成功后的数据处理
  async handleAuthCallback(user: any): Promise<User> {
    console.log('🔄 UserService: 开始处理登录回调...')

    try {
      // 1. 确保用户在数据库中存在（修复外键问题的关键）
      // 添加超时保护，防止老用户登录时数据库操作卡住
      const ensureUserPromise = this.ensureUserExists(user);
      const ensureUserTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ensureUserExists timeout')), 20000)
      );

      const dbUser = await Promise.race([ensureUserPromise, ensureUserTimeout]) as User;
      console.log('✅ UserService: 数据库用户同步成功:', dbUser.id)

      // 2. 更新本地状态
      this.currentUser = dbUser
      this.anonymousId = dbUser.anonymous_id

      // 3. 持久化到 LocalStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(dbUser))
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('anonymous_id', dbUser.anonymous_id || '')
      }

      // 4. 尝试迁移匿名数据 (Phase 5 会详细实现，这里先保留基础调用)
      if (dbUser.anonymous_id) {
        this.migrateAnonymousLetters(dbUser.anonymous_id, dbUser).catch(err =>
          console.warn('Background migration failed:', err)
        )
      }

      return dbUser

    } catch (error) {
      console.error('💥 UserService: 处理登录回调失败:', error)
      // 降级处理：仅本地保存，允许用户继续使用（虽然可能会有部分功能受限）
      console.log('⚠️ UserService: 使用 fallback 用户模式')
      return this.createFallbackUser(user)
    }
  }

  // 创建fallback用户
  private createFallbackUser(user: any): User {
    console.log('🔄 UserService: 创建fallback用户')

    // 确保ID存在
    const userId = user.id || user.sub || user.aud
    if (!userId) {
      console.error('❌ UserService: fallback用户也无法获取有效ID')
      throw new Error('无法获取用户ID，登录失败')
    }

    const fallbackUser = {
      id: userId,
      email: user.email,
      google_id: userId,
      anonymous_id: this.anonymousId || generateAnonymousId(),
      display_name: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || user.email?.split('@')[0],
      avatar_url: (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      coins: 10,
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
    console.log('🚪 UserService: 开始快速登出...')

    // 立即清除内存状态，减少等待时间
    this.currentUser = null

    // 快速清理localStorage中的用户数据
    if (typeof window !== 'undefined') {
      console.log('🧹 快速清理localStorage用户数据...')
      const keysToRemove = [
        'user',
        'isAuthenticated',
        'supabase_auth_error',
        'history_letters_cache',  // 清理 History 缓存
        'history_letters_cache_time'  // 清理 History 缓存时间
      ]
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // 异步清除Supabase会话数据，不阻塞主流程
      setTimeout(() => {
        try {
          const supabaseKeys = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-')) {
              supabaseKeys.push(key)
            }
          }
          supabaseKeys.forEach(key => localStorage.removeItem(key))
          console.log(`🧹 异步清除了 ${supabaseKeys.length} 个Supabase会话项目`)
        } catch (error) {
          console.warn('清除Supabase会话数据时出错:', error)
        }
      }, 0)

      console.log(`🧹 快速清除了 ${keysToRemove.length} 个关键localStorage项目`)
    }

    // 异步清除Supabase会话，不阻塞用户界面
    if (supabase) {
      setTimeout(async () => {
        try {
          await supabase!.auth.signOut()
          console.log('✅ 异步Supabase登出成功')
        } catch (error) {
          console.warn('⚠️ 异步Supabase登出失败（不影响本地状态）:', error)
        }
      }, 0)
    }

    console.log('✅ UserService: 快速登出完成（本地状态已清除）')
  }

  // 从数据库获取用户数据并缓存 - 优化版本
  async fetchAndCacheUser(): Promise<User | null> {
    console.log('🔍 fetchAndCacheUser: 开始获取用户数据...')

    if (!supabase) {
      console.warn('⚠️ fetchAndCacheUser: Supabase不可用，无法从数据库获取用户')
      return null
    }

    // 创建本地引用以避免TypeScript null检查问题
    const supabaseClient = supabase

    try {
      // 为整个方法设置总超时时间
      const totalTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('fetchAndCacheUser总超时')), 8000)
      )

      const fetchProcess = async () => {
        // 1. 检查Supabase会话 - 减少超时时间
        console.log('🔍 fetchAndCacheUser: 检查Supabase会话...')

        const sessionPromise = supabaseClient.auth.getSession()
        const sessionTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session获取超时')), 3000)
        )

        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any
        const { data: { session }, error: sessionError } = sessionResult

        if (sessionError) {
          console.error('❌ fetchAndCacheUser: 获取会话失败:', sessionError)
          return null
        }

        if (!session) {
          console.log('📱 fetchAndCacheUser: 无Supabase会话')
          return null
        }

        console.log('✅ fetchAndCacheUser: 找到Supabase会话:', {
          userId: session.user.id,
          email: session.user.email
        })

        // 2. 获取认证用户 - 减少超时时间
        const userPromise = supabaseClient.auth.getUser()
        const userTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GetUser超时')), 2000)
        )

        const userResult = await Promise.race([userPromise, userTimeout]) as any
        const { data: { user: authUser }, error: userError } = userResult

        if (userError) {
          console.error('❌ fetchAndCacheUser: 获取认证用户失败:', userError)
          return null
        }

        if (!authUser) {
          console.log('📱 fetchAndCacheUser: 无认证用户')
          return null
        }

        console.log('✅ fetchAndCacheUser: 找到认证用户:', {
          id: authUser.id,
          email: authUser.email,
          metadata: authUser.user_metadata
        })

        return authUser
      }

      const authUser = await Promise.race([fetchProcess(), totalTimeout]) as any

      if (!authUser) {
        return null
      }

      // 3. 从数据库获取完整用户信息 - 优化查询逻辑
      console.log('🔍 fetchAndCacheUser: 查询数据库用户数据...', {
        查询字段: 'id',
        查询值: authUser.id,
        用户邮箱: authUser.email
      })

      // 优化的数据库查询 - 并行查询提高效率
      let userData = null

      try {
        // 并行执行多种查询方式，提高效率
        const queryPromises = [
          // 查询1: 通过id查询
          supabaseClient.from('users').select('*').eq('id', authUser.id).limit(1),
          // 查询2: 通过google_id查询
          supabaseClient.from('users').select('*').eq('google_id', authUser.id).limit(1),
          // 查询3: 通过email查询
          supabaseClient.from('users').select('*').eq('email', authUser.email).limit(1)
        ]

        // 为数据库查询设置超时
        const dbTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('数据库查询超时')), 4000)
        )

        const queryResults = await Promise.race([
          Promise.allSettled(queryPromises),
          dbTimeout
        ]) as any

        // 检查查询结果
        for (let i = 0; i < queryResults.length; i++) {
          const result = queryResults[i]
          if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
            userData = result.value.data[0]
            const queryType = ['id', 'google_id', 'email'][i]
            console.log(`✅ fetchAndCacheUser: 通过${queryType}找到用户`)
            break
          } else if (result.status === 'rejected') {
            console.warn(`⚠️ fetchAndCacheUser: ${['id', 'google_id', 'email'][i]}查询失败:`, result.reason)
          }
        }

        if (!userData) {
          console.warn('⚠️ fetchAndCacheUser: 所有查询都未找到用户数据')
          return null
        }

      } catch (queryError) {
        console.error('❌ fetchAndCacheUser: 数据库查询异常:', queryError)
        return null
      }

      console.log('✅ fetchAndCacheUser: 从数据库获取用户成功:', {
        原始数据完整输出: JSON.stringify(userData, null, 2),
        数据类型: typeof userData,
        是否为数组: Array.isArray(userData),
        所有字段: Object.keys(userData || {}),
        字段值检查: {
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
          anonymous_id: userData.anonymous_id,
          // 可能的其他字段名
          user_id: userData.user_id,
          picture: userData.picture,
          full_name: userData.full_name,
          name: userData.name
        }
      })

      // 4. 缓存到内存
      this.currentUser = userData
      console.log('💾 fetchAndCacheUser: 已缓存到内存')

      // 5. 缓存到localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(userData))
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('anonymous_id', userData.anonymous_id || '')

          // 验证保存
          const savedUser = localStorage.getItem('user')
          const savedAuth = localStorage.getItem('isAuthenticated')

          console.log('✅ fetchAndCacheUser: localStorage缓存成功:', {
            userSaved: !!savedUser,
            authSaved: savedAuth === 'true',
            userEmail: savedUser ? JSON.parse(savedUser).email : 'None'
          })
        } catch (saveError) {
          console.error('❌ fetchAndCacheUser: localStorage缓存失败:', saveError)
        }
      }

      return userData

    } catch (error) {
      console.error('💥 fetchAndCacheUser: 获取用户数据异常:', error)
      return null
    }
  }

  // 获取当前用户 - 优先检查localStorage
  getCurrentUser(): User | null {
    // 1. 检查内存缓存
    if (this.currentUser && this.currentUser.email && this.currentUser.id) {
      console.log('🎯 从内存获取用户:', this.currentUser.email, 'ID:', this.currentUser.id)
      return this.currentUser
    }

    // 2. 检查localStorage作为fallback
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user')
        const storedAuth = localStorage.getItem('isAuthenticated')

        if (storedUser && storedAuth === 'true') {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser && parsedUser.email) {
            if (parsedUser.id) {
              console.log('🎯 从localStorage获取用户并同步到内存:', parsedUser.email, 'ID:', parsedUser.id)
              this.currentUser = parsedUser // 同步到内存
              return parsedUser
            } else {
              console.warn('⚠️ localStorage用户数据缺少ID，尝试修复...', {
                hasEmail: !!parsedUser.email,
                hasId: !!parsedUser.id,
                hasGoogleId: !!parsedUser.google_id,
                userData: parsedUser
              })

              // 尝试从google_id或其他字段恢复ID
              if (parsedUser.google_id) {
                parsedUser.id = parsedUser.google_id
                console.log('🔧 使用google_id作为用户ID:', parsedUser.id)

                // 重新保存修复后的数据
                localStorage.setItem('user', JSON.stringify(parsedUser))
                this.currentUser = parsedUser
                return parsedUser
              } else {
                console.error('❌ 无法修复用户ID - 既没有id也没有google_id')
                // 清除损坏的数据，强制重新登录
                localStorage.removeItem('user')
                localStorage.removeItem('isAuthenticated')
                return null
              }
            }
          } else {
            console.warn('⚠️ localStorage用户数据不完整:', {
              hasEmail: !!parsedUser?.email,
              hasId: !!parsedUser?.id,
              userData: parsedUser
            })
            // 清除不完整的数据
            localStorage.removeItem('user')
            localStorage.removeItem('isAuthenticated')
            return null
          }
        }
      } catch (error) {
        console.warn('⚠️ getCurrentUser: localStorage解析失败:', error)
        // 清除损坏的数据
        localStorage.removeItem('user')
        localStorage.removeItem('isAuthenticated')
        return null
      }
    }

    console.log('📱 内存和localStorage中都无有效用户')
    return null
  }

  // 设置当前用户到内存（用于状态同步）
  setCurrentUser(user: User | null): void {
    console.log('🔄 setCurrentUser: 设置用户到内存:', user?.email || 'null')
    this.currentUser = user
  }

  // 异步获取当前用户 - 优化版本，优先使用localStorage
  async getCurrentUserAsync(): Promise<User | null> {
    console.log('🔍 getCurrentUserAsync: 开始异步获取用户...')

    // 1. 检查内存缓存
    if (this.currentUser && this.currentUser.email) {
      console.log('🎯 getCurrentUserAsync: 从内存获取用户:', this.currentUser.email)
      return this.currentUser
    }

    // 2. 优先检查localStorage（与Header保持一致）
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user')
        const storedAuth = localStorage.getItem('isAuthenticated')

        if (storedUser && storedAuth === 'true') {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser && parsedUser.email) {
            console.log('✅ getCurrentUserAsync: 从localStorage恢复用户:', parsedUser.email)
            this.currentUser = parsedUser
            return parsedUser
          }
        }
      } catch (parseError) {
        console.warn('⚠️ getCurrentUserAsync: localStorage解析失败:', parseError)
      }
    }

    // 3. 如果localStorage没有，再从Supabase Auth获取
    if (supabase) {
      // 创建本地引用以避免TypeScript null检查问题
      const supabaseClient = supabase

      try {
        console.log('🔍 getCurrentUserAsync: 从Supabase Auth获取用户...')

        // 为Auth查询设置超时
        const authPromise = supabaseClient.auth.getUser()
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth查询超时')), 3000)
        )

        const authResult = await Promise.race([authPromise, authTimeout]) as any
        const { data: { user: authUser }, error } = authResult

        if (error) {
          console.warn('⚠️ getCurrentUserAsync: Supabase Auth获取失败:', error)
          return null
        }

        if (authUser) {
          console.log('✅ getCurrentUserAsync: 找到Supabase Auth用户:', authUser.email)

          // 尝试从数据库获取完整用户信息，但设置较短超时
          try {
            const dbPromise = this.fetchAndCacheUser()
            const dbTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('数据库查询超时')), 4000)
            )

            const fullUser = await Promise.race([dbPromise, dbTimeout]) as any
            if (fullUser) {
              return fullUser
            }
          } catch (dbError) {
            console.warn('⚠️ getCurrentUserAsync: 数据库获取失败，使用Auth基本信息:', dbError)
          }

          // 如果数据库获取失败，使用Auth用户信息
          const basicUser = {
            id: authUser.id,
            email: authUser.email,
            google_id: authUser.id,
            display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0],
            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
            anonymous_id: this.anonymousId || generateAnonymousId(),
            created_at: authUser.created_at,
            updated_at: new Date().toISOString(),
            coins: 10,
            is_premium: false
          }

          this.currentUser = basicUser

          // 保存到localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('user', JSON.stringify(basicUser))
              localStorage.setItem('isAuthenticated', 'true')
            } catch (saveError) {
              console.warn('⚠️ localStorage保存失败:', saveError)
            }
          }

          return basicUser
        } else {
          console.log('📱 getCurrentUserAsync: Supabase Auth无用户，尝试通过匿名ID查找...')
          
          const anonId = this.getAnonymousId()
          if (anonId) {
            const { data: anonUser, error: anonError } = await supabaseClient
              .from('users')
              .select('*')
              .eq('anonymous_id', anonId)
              .maybeSingle()

            if (anonUser && !anonError) {
              console.log('✅ getCurrentUserAsync: 找到匿名用户记录:', anonUser.id)
              this.currentUser = anonUser
              if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(anonUser))
                localStorage.setItem('isAuthenticated', 'false') // Still not "logged in" in the auth sense
              }
              return anonUser
            }
          }

          return null
        }
      } catch (error) {
        console.error('💥 getCurrentUserAsync: Supabase Auth查询异常:', error)
        return null
      }
    }

    return null
  }

  // 获取匿名ID
  getAnonymousId(): string | null {
    return this.anonymousId || localStorage.getItem('anonymous_id')
  }

  // 检查是否已登录 - 同步检查内存和localStorage
  isAuthenticated(): boolean {
    // 1. 检查内存状态
    if (this.currentUser && this.currentUser.email) {
      return true
    }

    // 2. 检查localStorage状态
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('isAuthenticated')
        const storedUser = localStorage.getItem('user')

        if (storedAuth === 'true' && storedUser) {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser && parsedUser.email) {
            // 同步到内存
            this.currentUser = parsedUser
            return true
          }
        }
      } catch (error) {
        console.warn('⚠️ isAuthenticated: localStorage检查失败:', error)
      }
    }

    return false
  }

  // 更新用户资料
  async updateProfile(updates: Partial<User>): Promise<User> {
    console.log('🔄 UserService: 开始更新用户资料:', updates)

    if (!supabase) {
      throw new Error('数据库连接不可用')
    }

    // 优化的用户检查 - 如果内存中没有用户，尝试获取
    let currentUser = this.currentUser
    if (!currentUser || !currentUser.id) {
      console.log('⚠️ updateProfile: 内存中无用户或用户ID缺失，尝试获取...')

      // 首先尝试从localStorage获取并修复
      currentUser = this.getCurrentUser()

      // 如果localStorage也没有或者修复失败，尝试从数据库获取
      if (!currentUser || !currentUser.id) {
        console.log('⚠️ updateProfile: localStorage也无有效用户，尝试从数据库获取...')
        currentUser = await this.getCurrentUserAsync()
      }

      if (!currentUser || !currentUser.id) {
        console.error('❌ updateProfile: 无法获取用户信息或用户ID', {
          hasCurrentUser: !!currentUser,
          hasId: !!currentUser?.id,
          hasEmail: !!currentUser?.email,
          userData: currentUser
        })
        throw new Error('用户未登录或用户ID缺失，请重新登录')
      }

      console.log('✅ updateProfile: 成功获取用户:', currentUser.email, 'ID:', currentUser.id)
    }

    console.log('📡 UserService: 发送数据库更新请求, 用户ID:', currentUser.id)

    if (!currentUser.id) {
      console.error('❌ updateProfile: 用户ID仍为undefined')
      throw new Error('用户ID无效，无法更新资料')
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single()

    if (error) {
      console.error('❌ UserService: 数据库更新失败:', error)
      throw error
    }

    console.log('✅ UserService: 数据库更新成功:', data)

    this.currentUser = data

    // 更新localStorage中的用户数据
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data))
      console.log('💾 UserService: localStorage已更新')
    }

    return data
  }

  // 社交媒体平台常量
  private static readonly SOCIAL_PLATFORMS = ['whatsapp', 'tiktok', 'instagram', 'facebook', 'x'] as const

  // 提取纯社交媒体信息（排除Google OAuth数据）
  private extractSocialMediaOnly(data: any): any {
    if (!data || typeof data !== 'object') {
      return {}
    }

    const result: any = {}

    UserService.SOCIAL_PLATFORMS.forEach(field => {
      if (data[field] && typeof data[field] === 'string' && data[field].trim() !== '') {
        result[field] = data[field].trim()
      }
    })

    console.log('🔍 提取社交媒体信息:', {
      原始数据字段数: Object.keys(data).length,
      提取后字段数: Object.keys(result).length,
      提取结果: result
    })

    return result
  }

  // 验证社交媒体平台是否有效
  private isValidSocialPlatform(platform: string): boolean {
    return UserService.SOCIAL_PLATFORMS.includes(platform as any)
  }

  // 清理用户的社交媒体数据（移除Google OAuth污染）
  async cleanupUserSocialMediaData(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUser?.id

    if (!targetUserId) {
      throw new Error('无法获取用户ID进行数据清理')
    }

    console.log('🧹 开始清理用户社交媒体数据，用户ID:', targetUserId)

    if (!supabase) {
      console.warn('⚠️ Supabase不可用，无法清理数据库数据')
      return
    }

    try {
      // 获取当前用户数据
      const { data: currentUserData, error: fetchError } = await supabase
        .from('users')
        .select('social_media_info')
        .eq('id', targetUserId)
        .single()

      if (fetchError) {
        console.error('❌ 获取用户数据失败:', fetchError)
        return
      }

      // 提取纯社交媒体信息
      const cleanSocialMedia = this.extractSocialMediaOnly(currentUserData.social_media_info)

      // 更新数据库
      const { error: updateError } = await supabase
        .from('users')
        .update({
          social_media_info: cleanSocialMedia
        })
        .eq('id', targetUserId)

      if (updateError) {
        console.error('❌ 清理社交媒体数据失败:', updateError)
      } else {
        console.log('✅ 社交媒体数据清理成功:', cleanSocialMedia)

        // 更新本地缓存
        if (this.currentUser && this.currentUser.id === targetUserId) {
          this.currentUser.social_media_info = cleanSocialMedia

          // 更新localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(this.currentUser))
          }
        }
      }
    } catch (error) {
      console.error('💥 清理社交媒体数据异常:', error)
    }
  }
  async updateSocialMedia(socialMedia: {
    whatsapp?: string
    tiktok?: string
    instagram?: string
    facebook?: string
    x?: string
  }): Promise<User> {
    console.log('🔄 updateSocialMedia: 开始更新社交媒体信息:', socialMedia)

    // 优化的用户检查 - 如果内存中没有用户，尝试获取
    let currentUser = this.currentUser
    if (!currentUser) {
      console.log('⚠️ updateSocialMedia: 内存中无用户，尝试获取...')
      currentUser = await this.getCurrentUserAsync()

      if (!currentUser) {
        console.error('❌ updateSocialMedia: 无法获取用户信息')
        throw new Error('用户未登录')
      }

      console.log('✅ updateSocialMedia: 成功获取用户:', currentUser.email)
    }

    // 提取现有的纯社交媒体信息（排除Google OAuth数据）
    const currentSocialMedia = this.extractSocialMediaOnly(currentUser.social_media_info)

    // 验证输入的社交媒体平台
    const validatedSocialMedia: any = {}
    Object.keys(socialMedia).forEach(platform => {
      if (this.isValidSocialPlatform(platform) && socialMedia[platform as keyof typeof socialMedia]) {
        const value = socialMedia[platform as keyof typeof socialMedia]
        if (value && value.trim() !== '') {
          validatedSocialMedia[platform] = value.trim()
        }
      }
    })

    console.log('🔍 验证后的社交媒体数据:', validatedSocialMedia)

    // 合并新的社交媒体信息
    const updatedSocialMedia = { ...currentSocialMedia, ...validatedSocialMedia }

    // 过滤掉空值
    Object.keys(updatedSocialMedia).forEach(key => {
      if (!updatedSocialMedia[key] || updatedSocialMedia[key].trim() === '') {
        delete updatedSocialMedia[key]
      }
    })

    console.log('🔄 updateSocialMedia: 处理后的社交媒体信息:', {
      current: currentSocialMedia,
      new: validatedSocialMedia,
      merged: updatedSocialMedia
    })

    return await this.updateProfile({
      social_media_info: updatedSocialMedia
    })
  }

  // 获取用户社交媒体信息（需要积分）
  async getUserSocialMedia(userId: string): Promise<{
    whatsapp?: string
    tiktok?: string
    instagram?: string
    facebook?: string
    x?: string
  } | null> {
    if (!supabase) {
      throw new Error('数据库连接不可用')
    }

    // 检查是否是查看自己的信息
    if (this.currentUser && this.currentUser.id === userId) {
      return this.currentUser.social_media_info || {}
    }

    // 查看他人信息需要消耗积分
    if (!this.currentUser) {
      throw new Error('需要登录才能查看他人信息')
    }

    if (this.currentUser.coins < 10) {
      throw new Error('积分不足，查看他人社交媒体信息需要10积分')
    }

    // 扣除积分
    await this.updateProfile({
      coins: this.currentUser.coins - 10
    })

    // 获取目标用户的社交媒体信息
    const { data, error } = await supabase
      .from('users')
      .select('social_media_info')
      .eq('id', userId)
      .single()

    if (error) throw error

    return data?.social_media_info || {}
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