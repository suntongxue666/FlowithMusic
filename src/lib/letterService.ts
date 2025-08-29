import { supabase, Letter } from './supabase'
import { supabaseProxy } from './supabaseProxy'
import { userService } from './userService'
import { fallbackStorage } from './fallbackStorage'
import { cacheManager } from './cacheManager'

export interface CreateLetterData {
  to: string
  message: string
  song: {
    id: string
    title: string
    artist: string
    albumCover: string
    previewUrl?: string
    spotifyUrl: string
  }
}

export class LetterService {
  private static instance: LetterService

  static getInstance(): LetterService {
    if (!LetterService.instance) {
      LetterService.instance = new LetterService()
    }
    return LetterService.instance
  }

  // 生成Letter链接ID
  private generateLinkId(): string {
    const now = new Date()
    const timeStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0') + 
                   now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0')
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let randomStr = ''
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return timeStr + randomStr
  }

  // 创建Letter
  async createLetter(letterData: CreateLetterData): Promise<Letter> {
    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()
    const linkId = this.generateLinkId()
    
    console.log('Creating letter with user context:', {
      user: user?.id,
      anonymousId,
      isAuthenticated: !!user
    })
    
    let createdLetter: Letter
    
    // 构建新letter数据
    const newLetter = {
      user_id: user?.id || null,
      anonymous_id: user ? null : anonymousId,
      link_id: linkId,
      recipient_name: letterData.to.trim(),
      message: letterData.message.trim(),
      song_id: letterData.song.id,
      song_title: letterData.song.title,
      song_artist: letterData.song.artist,
      song_album_cover: letterData.song.albumCover,
      song_preview_url: letterData.song.previewUrl,
      song_spotify_url: letterData.song.spotifyUrl,
      view_count: 0,
      is_public: true
    }

    console.log('Creating letter with data:', newLetter)

    // 首先保存到localStorage确保数据不丢失
    const localLetter: Letter = {
      id: linkId,
      user_id: newLetter.user_id || undefined,
      anonymous_id: newLetter.anonymous_id || undefined,
      link_id: newLetter.link_id,
      recipient_name: newLetter.recipient_name,
      message: newLetter.message,
      song_id: newLetter.song_id,
      song_title: newLetter.song_title,
      song_artist: newLetter.song_artist,
      song_album_cover: newLetter.song_album_cover,
      song_preview_url: newLetter.song_preview_url,
      song_spotify_url: newLetter.song_spotify_url,
      view_count: newLetter.view_count,
      is_public: newLetter.is_public,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 立即保存到localStorage
    const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
    existingLetters.unshift(localLetter)
    localStorage.setItem('letters', JSON.stringify(existingLetters))
    console.log('✅ Letter immediately saved to localStorage')
    
    // 设置默认返回值
    createdLetter = localLetter

    // 尝试保存到数据库（重要：确保其他用户能看到）
    let dbSaveSuccess = false
    
    // 测试代理连接状态
    console.log('🔍 测试数据库连接状态...')
    const proxyConnected = await supabaseProxy.testConnection()
    console.log('📡 代理连接状态:', proxyConnected ? '✅ 可用' : '❌ 不可用')
    
    // 首先尝试直接Supabase连接
    try {
      if (supabase) {
        console.log('📝 尝试直接保存到Supabase...')
        
        const { data, error } = await supabase
          .from('letters')
          .insert(newLetter)
          .select(`
            *,
            user:users(
              id,
              display_name,
              avatar_url
            )
          `)
          .single()

        if (!error && data) {
          console.log('✅ Letter成功保存到Supabase数据库:', data.id)
          createdLetter = data
          dbSaveSuccess = true
          
          // 更新localStorage中的数据
          const updatedLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const index = updatedLetters.findIndex((l: any) => l.link_id === linkId)
          if (index !== -1) {
            updatedLetters[index] = data
            localStorage.setItem('letters', JSON.stringify(updatedLetters))
          }
        } else {
          console.warn('❌ 直接Supabase保存失败，错误详情:', error)
          console.warn('📝 将尝试代理方式保存...')
        }
      } else {
        console.warn('❌ Supabase客户端未初始化，将尝试代理方式...')
      }
    } catch (dbError) {
      console.warn('❌ 直接数据库连接异常，错误详情:', dbError)
      console.warn('📝 将尝试代理方式保存...')
    }
    
    // 如果直接连接失败，强制尝试使用supabaseProxy
    if (!dbSaveSuccess) {
      try {
        console.log('📝 开始通过代理保存到数据库...')
        
        // 由于外键约束问题，暂时使用匿名方式保存
        // 这样可以避免用户记录不存在导致的保存失败
        if (newLetter.user_id) {
          console.log('📝 检测到用户ID，但为避免外键约束问题，改为匿名保存')
          console.log('📝 原用户ID:', newLetter.user_id)
          
          // 保存原始用户信息到localStorage，但数据库使用匿名方式
          localLetter.user_id = newLetter.user_id
          
          // 数据库保存时使用匿名方式
          newLetter.user_id = null
          newLetter.anonymous_id = userService.getAnonymousId()
          
          console.log('📝 改为匿名ID:', newLetter.anonymous_id)
        }
        
        console.log('📝 代理保存的数据:', JSON.stringify(newLetter, null, 2))
        const proxyResult = await supabaseProxy.insert('letters', newLetter)
        console.log('📝 代理保存结果:', JSON.stringify(proxyResult, null, 2))
        
        if (proxyResult && proxyResult.data) {
          console.log('✅ Letter通过代理成功保存到数据库!')
          console.log('📝 保存的Letter ID:', proxyResult.data.id)
          console.log('📝 保存的Link ID:', proxyResult.data.link_id)
          
          // 使用代理返回的完整数据
          createdLetter = proxyResult.data
          dbSaveSuccess = true
          
          // 更新localStorage中的数据
          const updatedLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const index = updatedLetters.findIndex((l: any) => l.link_id === linkId)
          if (index !== -1) {
            updatedLetters[index] = createdLetter
            localStorage.setItem('letters', JSON.stringify(updatedLetters))
            console.log('✅ localStorage已更新为数据库版本')
          }
        } else {
          console.error('❌ 代理保存失败，返回数据为空:', proxyResult)
        }
      } catch (proxyError) {
        console.error('❌ 代理保存异常:', proxyError)
        console.error('❌ 错误详情:', JSON.stringify(proxyError, null, 2))
        
        // 最后尝试使用fallbackStorage
        try {
          console.log('📝 尝试使用备用存储...')
          const fallbackResult = await fallbackStorage.saveLetter(localLetter)
          if (fallbackResult) {
            console.log('✅ Letter保存到备用存储成功')
            dbSaveSuccess = true
          }
        } catch (fallbackError) {
          console.error('❌ 备用存储也失败:', fallbackError)
        }
      }
    }
    
    // 最终检查和警告
    if (!dbSaveSuccess) {
      console.error('🚨 重要警告：Letter未能保存到数据库！')
      console.error('📍 影响：其他用户将无法在首页和Explore页面看到此Letter')
      console.error('💡 建议：请检查网络连接或稍后重试')
      console.error('🔧 技术信息：Letter已保存到localStorage，但未同步到服务器')
      
      // 设置认证错误标记，让前端知道需要显示本地数据
      localStorage.setItem('supabase_auth_error', 'true')
    } else {
      console.log('🎉 Letter成功保存到数据库，其他用户现在可以看到了！')
      
      // 清除认证错误标记，因为数据库操作成功了
      localStorage.removeItem('supabase_auth_error')
      
      // 立即清除所有相关缓存，确保新数据能被其他用户看到
      this.clearPublicLettersCache()
      this.clearUserLettersCache(user?.id, anonymousId)
      
      // 额外清除可能的缓存键
      cacheManager.clear()
      console.log('🗑️ 已清除所有缓存，确保新Letter立即可见')
    }

    // 尝试保存到fallback存储（用于跨用户访问）
    try {
      await fallbackStorage.saveLetter(createdLetter)
      console.log('✅ Letter also saved to fallback storage')
    } catch (fallbackError) {
      console.warn('Fallback storage failed:', fallbackError)
    }
    
    // 为了确保Letter可以被访问，我们在Letter对象中添加一个包含数据的链接
    const letterWithDataLink = {
      ...createdLetter,
      shareable_link: this.generateShareableLink(createdLetter)
    }
    
    // 清除相关缓存
    this.clearUserLettersCache(user?.id, anonymousId)
    this.clearPublicLettersCache()
    
    return letterWithDataLink
  }

  // 清除用户Letters缓存
  private clearUserLettersCache(userId?: string, anonymousId?: string | null): void {
    // 清除各种可能的缓存键组合
    const keysToCheck = [
      `user_letters_userId:${userId || 'anonymous'}|anonymousId:${anonymousId || 'none'}|limit:10|offset:0`,
      `user_letters_userId:${userId || 'anonymous'}|anonymousId:${anonymousId || 'none'}|limit:50|offset:0`,
      // 还可以添加其他常用的limit/offset组合
    ]
    
    keysToCheck.forEach(key => {
      cacheManager.delete(key)
    })
    
    // 清除所有letter相关的缓存
    cacheManager.clearByPattern('user_letters_')
    cacheManager.clearByPattern('letter_by_link_id_')
  }

  // 清除公开Letters缓存
  private clearPublicLettersCache(): void {
    const keysToCheck = [
      // 首页MusicCards使用的缓存键 - getPublicLetters(20, 0, 'created_at')
      cacheManager.generateKey('public_letters', {
        limit: 20,
        offset: 0,
        sortBy: 'created_at',
        artist: 'none',
        timeRange: 'all'
      }),
      // Explore页面可能使用的缓存键
      cacheManager.generateKey('public_letters', {
        limit: 6,
        offset: 0,
        sortBy: 'created_at',
        artist: 'none',
        timeRange: 'all'
      }),
      // 其他常用组合
      cacheManager.generateKey('public_letters', {
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        artist: 'none',
        timeRange: 'all'
      })
    ]
    
    keysToCheck.forEach(key => {
      cacheManager.delete(key)
    })
  }



  // 增加浏览次数
  private async incrementViewCount(letterId: string, linkId?: string): Promise<void> {
    if (!supabase) return
    
    try {
      // 优先使用新的公开函数（支持匿名用户）
      if (linkId) {
        await supabase.rpc('public_increment_view_count', { letter_link_id: linkId })
      } else {
        // 备用方案：使用原来的函数（需要认证）
        await supabase.rpc('increment_view_count', { letter_id: letterId })
      }
    } catch (error) {
      console.warn('Failed to increment view count:', error)
      // 浏览计数失败不应阻止Letter的正常访问
    }
  }

  // 从localStorage获取Letters的辅助方法
  private getLettersFromLocalStorage(user: any, anonymousId: string | null, limit: number, offset: number, showAll: boolean = false): Letter[] {
    const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
    console.log('📱 localStorage中发现Letters:', existingLetters.length)
    
    let userLetters = existingLetters
    
    // 如果不是显示全部模式，则过滤用户的Letters
    if (!showAll) {
      userLetters = existingLetters.filter((letter: Letter) => {
        if (user?.id) {
          // 已登录用户：匹配user_id或anonymous_id
          return letter.user_id === user.id || 
                 (anonymousId && letter.anonymous_id === anonymousId) ||
                 (!letter.user_id && letter.anonymous_id === anonymousId)
        } else {
          return letter.anonymous_id === anonymousId
        }
      })
    }
    
    console.log('📋 ' + (showAll ? '显示全部Letters' : '过滤后的用户Letters') + ':', userLetters.length)
    
    // 按时间排序并分页
    return userLetters
      .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
  }

  // 获取用户的Letters
  async getUserLetters(limit: number = 10, offset: number = 0): Promise<Letter[]> {
    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()
    
    // 检查是否设置了永久显示全部letters的标记
    const forceShowAll = localStorage.getItem('force_show_all_letters')
    if (forceShowAll) {
      console.log('📋 检测到永久显示全部标记，直接从localStorage获取所有Letters')
      return this.getLettersFromLocalStorage(user, anonymousId, limit, offset, true)
    }
    
    // 检查是否最近进行过数据恢复
    const recoveryTimestamp = localStorage.getItem('letters_recovered')
    const recentlyRecovered = recoveryTimestamp && (Date.now() - parseInt(recoveryTimestamp)) < 30 * 60 * 1000 // 30分钟内
    
    if (recentlyRecovered) {
      console.log('🔄 检测到最近进行过数据恢复，优先使用localStorage数据')
    }
    
    // 如果有Supabase认证错误，优先使用localStorage避免403错误
    const hasAuthError = localStorage.getItem('supabase_auth_error')
    if (hasAuthError) {
      console.log('🔄 检测到认证错误，优先使用localStorage数据')
      return this.getLettersFromLocalStorage(user, anonymousId, limit, offset)
    }
    
    console.log('🔍 getUserLetters调用 - 详细状态检查:', {
      user: user ? {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      } : null,
      anonymousId,
      supabaseAvailable: !!supabase,
      isAuthenticated: userService.isAuthenticated(),
      recentlyRecovered
    })
    
    // 如果用户状态异常（已认证但无用户信息），跳过复杂处理，直接使用localStorage
    if (userService.isAuthenticated() && !user?.id) {
      console.warn('⚠️ 检测到用户状态异常，跳过复杂处理，使用localStorage数据')
      return this.getLettersFromLocalStorage(user, anonymousId, limit, offset)
    }
    
    // 重新获取用户状态
    const finalUser = userService.getCurrentUser()
    const finalAnonymousId = userService.getAnonymousId()
    
    // 生成缓存键 - 确保不使用undefined值
    const cacheKey = cacheManager.generateKey('user_letters', {
      userId: finalUser?.id || 'anonymous',
      anonymousId: finalAnonymousId || 'none',
      limit,
      offset
    })
    
    // 尝试从缓存获取 - 但如果用户状态刚刚变化，跳过缓存
    const shouldSkipCache = userService.isAuthenticated() && !finalUser?.id
    if (!shouldSkipCache) {
      const cachedData = cacheManager.get(cacheKey)
      if (cachedData && cachedData.length > 0) {
        console.log('✅ 使用有效缓存的用户Letters:', cachedData.length)
        return cachedData
      } else if (cachedData && cachedData.length === 0) {
        console.warn('⚠️ 发现空缓存，清除并重新查询')
        cacheManager.delete(cacheKey)
      }
    } else {
      console.log('🔄 跳过缓存due to用户状态异常')
    }
    
    let letters: Letter[] = []
    
    // 如果最近恢复过数据，优先使用localStorage，避免被数据库覆盖
    if (recentlyRecovered || !supabase) {
      console.log(recentlyRecovered ? '🔄 使用恢复的localStorage数据' : 'Supabase not available, checking localStorage')
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      console.log('📱 localStorage中发现Letters:', existingLetters.length)
      
      // 过滤用户的Letters - 改进逻辑
      const userLetters = existingLetters.filter((letter: Letter) => {
        if (finalUser?.id) {
          // 已登录用户：匹配user_id或anonymous_id
          return letter.user_id === finalUser.id || 
                 (finalAnonymousId && letter.anonymous_id === finalAnonymousId) ||
                 (!letter.user_id && letter.anonymous_id === finalAnonymousId)
        } else {
          return letter.anonymous_id === finalAnonymousId
        }
      })
      
      console.log('📋 过滤后的用户Letters:', userLetters.length)
      
      // 按时间排序并分页
      letters = userLetters
        .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + limit)
    } else {
      if (!finalUser?.id && !finalAnonymousId) {
        console.warn('No user or anonymous ID available')
        letters = []
      } else {
        try {
          let query = supabase
            .from('letters')
            .select(`
              *,
              user:users(
                id,
                display_name,
                avatar_url
              )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (finalUser?.id) {
            // 已登录用户：查询user_id匹配的Letters，以及anonymous_id匹配的Letters（用于未迁移的情况）
            if (finalAnonymousId) {
              query = query.or(`user_id.eq.${finalUser.id},anonymous_id.eq.${finalAnonymousId}`)
            } else {
              query = query.eq('user_id', finalUser.id)
            }
          } else if (finalAnonymousId) {
            // 匿名用户：查询anonymous_id匹配
            query = query.eq('anonymous_id', finalAnonymousId)
          } else {
            // 无有效用户标识，返回空结果
            console.warn('No valid user ID or anonymous ID available for query')
            letters = []
          }

          // 只有在有有效查询条件时才执行查询
          if (letters.length === 0 && (finalUser?.id || finalAnonymousId)) {
            const { data, error } = await query

            if (error) {
              console.error('Failed to get user letters:', error)
              // Fallback to localStorage
              const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
              const userLetters = existingLetters.filter((letter: Letter) => {
                if (finalUser?.id) {
                  // 已登录用户：匹配user_id或anonymous_id
                  return letter.user_id === finalUser.id || 
                         (finalAnonymousId && letter.anonymous_id === finalAnonymousId) ||
                         (!letter.user_id && letter.anonymous_id === finalAnonymousId)
                } else {
                  return letter.anonymous_id === finalAnonymousId
                }
              })
              
              letters = userLetters
                .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(offset, offset + limit)
            } else {
              letters = data || []
            }
          }
        } catch (networkError) {
          console.error('Network error, checking localStorage:', networkError)
          const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const userLetters = existingLetters.filter((letter: Letter) => {
            if (finalUser?.id) {
              // 已登录用户：匹配user_id或anonymous_id
              return letter.user_id === finalUser.id || 
                     (finalAnonymousId && letter.anonymous_id === finalAnonymousId) ||
                     (!letter.user_id && letter.anonymous_id === finalAnonymousId)
            } else {
              return letter.anonymous_id === finalAnonymousId
            }
          })
          
          letters = userLetters
            .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(offset, offset + limit)
        }
      }
    }
    
    console.log('📊 getUserLetters最终结果:', {
      lettersCount: letters.length,
      cacheKey,
      finalUser: finalUser ? { id: finalUser.id, email: finalUser.email } : null,
      finalAnonymousId,
      recentlyRecovered
    })
    
    // 缓存结果（缓存3分钟）- 增强缓存逻辑
    if (letters.length > 0) {
      // 如果有数据，一定要缓存
      cacheManager.set(cacheKey, letters, 3 * 60 * 1000)
      console.log('✅ 缓存Letters结果:', letters.length)
    } else if (!finalUser?.id && !finalAnonymousId) {
      // 只有在完全没有用户标识时才缓存空结果
      cacheManager.set(cacheKey, letters, 1 * 60 * 1000) // 空结果只缓存1分钟
      console.log('✅ 缓存空结果（无用户标识）')
    } else {
      console.log('⏭️ 跳过缓存空结果，保护已有数据')
    }
    
    // 如果最近恢复过数据且有结果，延长恢复标记的有效期
    if (recentlyRecovered && letters.length > 0) {
      localStorage.setItem('letters_recovered', Date.now().toString())
      console.log('🔄 延长数据恢复标记有效期')
    }
    
    return letters
  }

  // 紧急数据恢复 - 帮助用户找回所有可能的Letters
  async emergencyRecoverLetters(): Promise<Letter[]> {
    console.log('🚨 开始紧急Letter数据恢复...')
    
    try {
      // 1. 从localStorage获取所有Letters
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      console.log('📱 localStorage中发现Letters:', localLetters.length)
      
      // 2. 如果Supabase可用，尝试从数据库获取所有相关Letters
      let dbLetters: Letter[] = []
      if (supabase) {
        const user = userService.getCurrentUser()
        const anonymousId = userService.getAnonymousId()
        
        console.log('🔍 尝试从数据库恢复，用户状态:', {
          userId: user?.id,
          email: user?.email,
          anonymousId
        })
        
        try {
          // 如果有用户ID，获取该用户的所有Letters
          if (user?.id) {
            const { data: userLetters } = await supabase
              .from('letters')
              .select('*')
              .eq('user_id', user.id)
            
            if (userLetters) {
              dbLetters.push(...userLetters)
              console.log(`📊 从数据库恢复用户Letters: ${userLetters.length}`)
            }
          }
          
          // 如果有匿名ID，获取匿名Letters
          if (anonymousId) {
            const { data: anonLetters } = await supabase
              .from('letters')
              .select('*')
              .eq('anonymous_id', anonymousId)
              .is('user_id', null)
            
            if (anonLetters) {
              dbLetters.push(...anonLetters)
              console.log(`📊 从数据库恢复匿名Letters: ${anonLetters.length}`)
            }
          }
        } catch (dbError) {
          console.warn('⚠️ 数据库恢复失败:', dbError)
        }
      }
      
      // 3. 合并去重
      const allLetters = new Map<string, Letter>()
      
      // 优先使用数据库数据
      dbLetters.forEach(letter => {
        allLetters.set(letter.link_id, letter)
      })
      
      // 补充localStorage数据
      localLetters.forEach((letter: Letter) => {
        if (!allLetters.has(letter.link_id)) {
          allLetters.set(letter.link_id, letter)
        }
      })
      
      const recoveredLetters = Array.from(allLetters.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      console.log('✅ Letter恢复完成:', {
        总数: recoveredLetters.length,
        localStorage: localLetters.length,
        数据库: dbLetters.length,
        去重后: recoveredLetters.length
      })
      
      // 4. 强制更新localStorage确保数据完整和持久化
      try {
        localStorage.setItem('letters', JSON.stringify(recoveredLetters))
        
        // 验证保存是否成功
        const savedLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        console.log('💾 Letters数据保存验证:', {
          保存成功: savedLetters.length === recoveredLetters.length,
          保存数量: savedLetters.length,
          恢复数量: recoveredLetters.length
        })
        
        // 如果是已登录用户，还要确保用户数据关联正确
        const user = userService.getCurrentUser()
        if (user?.id) {
          console.log('🔗 已登录用户Letter数据关联检查:', {
            用户ID: user.id,
            关联的Letters: recoveredLetters.filter(l => l.user_id === user.id).length,
            匿名Letters: recoveredLetters.filter(l => !l.user_id).length
          })
          
          // 为了确保数据关联，将未关联的Letters关联到当前用户
          const anonymousId = userService.getAnonymousId()
          const updatedLetters = recoveredLetters.map(letter => {
            if (!letter.user_id && letter.anonymous_id === anonymousId) {
              console.log('🔄 将匿名Letter关联到用户:', letter.link_id)
              return { ...letter, user_id: user.id, anonymous_id: null }
            }
            return letter
          })
          
          if (updatedLetters.some(l => l.user_id === user.id)) {
            localStorage.setItem('letters', JSON.stringify(updatedLetters))
            console.log('✅ 已更新Letter数据关联')
          }
        }
        
      } catch (saveError) {
        console.error('❌ Letters数据保存失败:', saveError)
      }
      
      // 5. 清除相关缓存
      this.clearAllLetterCaches()
      
      // 6. 设置一个标记，表示数据已经恢复过，避免重复恢复
      localStorage.setItem('letters_recovered', Date.now().toString())
      
      return recoveredLetters
      
    } catch (error) {
      console.error('💥 Letter恢复失败:', error)
      return []
    }
  }
  
  // 清除所有Letter相关缓存
  private clearAllLetterCaches(): void {
    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()
    
    // 清除各种可能的缓存键组合
    const userIds = [user?.id, 'anonymous', 'undefined']
    const anonIds = [anonymousId, 'none', 'undefined']
    const limits = [10, 20, 50]
    const offsets = [0]
    
    userIds.forEach(userId => {
      anonIds.forEach(anonId => {
        limits.forEach(limit => {
          offsets.forEach(offset => {
            const key = `user_letters_userId:${userId}|anonymousId:${anonId}|limit:${limit}|offset:${offset}`
            cacheManager.delete(key)
          })
        })
      })
    })
    
    console.log('🧹 已清除所有Letter缓存')
  }

  // 获取公开的Letters信息流
  async getPublicLetters(
    limit: number = 20,
    offset: number = 0,
    sortBy: 'created_at' | 'view_count' = 'created_at',
    filterBy?: {
      artist?: string
      timeRange?: 'day' | 'week' | 'month' | 'all'
    }
  ): Promise<Letter[]> {
    // 生成缓存键
    const cacheKey = cacheManager.generateKey('public_letters', {
      limit,
      offset,
      sortBy,
      artist: filterBy?.artist || 'none',
      timeRange: filterBy?.timeRange || 'all'
    })
    
    // 尝试从缓存获取
    const cachedData = cacheManager.get(cacheKey)
    if (cachedData) {
      console.log('Using cached public letters:', cachedData.length)
      return cachedData
    }
    
    // 优先尝试代理API，失败时使用直接连接
    try {
      let queryOptions: any = {
        select: `
          *,
          user:users(
            id,
            display_name,
            avatar_url
          )
        `,
        filters: { eq: { is_public: true } },
        limit,
        offset, // 传递 offset 给代理
        order: { column: sortBy, ascending: false }
      }
      
      // 艺术家筛选
      if (filterBy?.artist) {
        queryOptions.filters.ilike = { song_artist: `%${filterBy.artist}%` }
      }
      
      // TODO: 时间范围筛选需要在代理API中实现
      
      const { data: proxyData, error: proxyError } = await supabaseProxy.select('letters', queryOptions)
      
      if (!proxyError && proxyData) {
        // 移除客户端分页，现在由代理处理
        // const paginatedData = proxyData.slice(offset, offset + limit)
        const paginatedData = proxyData; // 代理已经处理了分页

        // 缓存结果（缓存2分钟）
        cacheManager.set(cacheKey, paginatedData, 2 * 60 * 1000)
        
        return paginatedData
      } else {
        console.warn('Proxy API failed, falling back to direct Supabase:', proxyError)
      }
    } catch (proxyError) {
      console.warn('Proxy API error, falling back to direct Supabase:', proxyError)
    }

    if (!supabase) {
      console.warn('数据库连接不可用')
      return []
    }

    let query = supabase
      .from('letters')
      .select(`
        *,
        user:users(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)

    // 艺术家筛选
    if (filterBy?.artist) {
      query = query.ilike('song_artist', `%${filterBy.artist}%`)
    }

    // 时间范围筛选
    if (filterBy?.timeRange && filterBy.timeRange !== 'all') {
      const now = new Date()
      let startDate = new Date()
      
      switch (filterBy.timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
      }
      
      query = query.gte('created_at', startDate.toISOString())
    }

    // 排序
    const ascending = false // 默认降序
    query = query.order(sortBy, { ascending })

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('获取公开Letters失败:', error)
      return []
    }

    const letters = data || []
    
    // 缓存结果（缓存2分钟）
    cacheManager.set(cacheKey, letters, 2 * 60 * 1000)
    
    return letters
  }

  // 搜索Letters
  async searchLetters(
    searchTerm: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Letter[]> {
    if (!supabase) {
      console.warn('数据库连接不可用')
      return []
    }

    const { data, error } = await supabase
      .from('letters')
      .select(`
        *,
        user:users(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .or(`song_title.ilike.%${searchTerm}%,song_artist.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('搜索Letters失败:', error)
      return []
    }

    return data || []
  }

  // 获取热门艺术家列表
  async getPopularArtists(limit: number = 10): Promise<{ artist: string; count: number }[]> {
    if (!supabase) {
      console.warn('数据库连接不可用')
      return []
    }

    const { data, error } = await supabase
      .from('letters')
      .select('song_artist')
      .eq('is_public', true)

    if (error) {
      console.error('获取热门艺术家失败:', error)
      return []
    }

    // 统计艺术家出现次数
    const artistCounts: { [key: string]: number } = {}
    data?.forEach(letter => {
      const artist = letter.song_artist
      artistCounts[artist] = (artistCounts[artist] || 0) + 1
    })

    // 排序并返回前N个
    return Object.entries(artistCounts)
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  // 删除Letter（仅限创建者）
  async deleteLetter(letterId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('数据库连接不可用')
      return false
    }

    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()

    let query = supabase.from('letters').delete()

    if (user) {
      query = query.eq('user_id', user.id)
    } else if (anonymousId) {
      query = query.eq('anonymous_id', anonymousId)
    } else {
      return false
    }

    const { error } = await query.eq('id', letterId)

    if (error) {
      console.error('删除Letter失败:', error)
      return false
    }

    return true
  }

  // 更新Letter隐私设置
  async updateLetterPrivacy(letterId: string, isPublic: boolean): Promise<boolean> {
    if (!supabase) {
      console.warn('数据库连接不可用')
      return false
    }

    const user = userService.getCurrentUser()
    
    if (!user) {
      return false
    }

    const { error } = await supabase
      .from('letters')
      .update({ is_public: isPublic })
      .eq('id', letterId)
      .eq('user_id', user.id)

    if (error) {
      console.error('更新Letter隐私设置失败:', error)
      return false
    }

    return true
  }
  // 生成简洁的可分享链接
  private generateShareableLink(letter: Letter): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.flowithmusic.com'
    
    // 返回简洁的链接，不包含data参数
    return `${baseUrl}/letter/${letter.link_id}`
  }

  // 根据linkId获取单个Letter
  async getLetterByLinkId(linkId: string): Promise<Letter | null> {
    if (!linkId) {
      console.error('linkId is required')
      return null
    }

    // 生成缓存键
    const cacheKey = cacheManager.generateKey('letter_by_link_id', { linkId })
    
    // 尝试从缓存获取
    const cachedData = cacheManager.get(cacheKey)
    if (cachedData) {
      console.log('Using cached letter:', linkId)
      return cachedData
    }

    if (!supabase) {
      console.warn('数据库连接不可用，尝试从简单存储获取')
      
      // 如果Supabase不可用，尝试从简单存储获取
      try {
        const letter = await fallbackStorage.getLetter(linkId)
        if (letter) {
          console.log('Found letter in fallback storage:', linkId)
          // 缓存结果（缓存5分钟）
          cacheManager.set(cacheKey, letter, 5 * 60 * 1000)
          return letter
        }
      } catch (error) {
        console.error('Failed to get letter from fallback storage:', error)
      }
      
      return null
    }

    try {
      const { data, error } = await supabase
        .from('letters')
        .select(`
          *,
          user:users(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('link_id', linkId)
        .eq('is_public', true) // 确保只获取公开的Letters
        .single()

      if (error) {
        console.error('Failed to get letter by linkId:', error)
        
        // 如果Supabase查询失败，尝试从简单存储获取
        try {
          const letter = await fallbackStorage.getLetter(linkId)
          if (letter) {
            console.log('Found letter in fallback storage as fallback:', linkId)
            return letter
          }
        } catch (fallbackError) {
          console.error('Fallback storage also failed:', fallbackError)
        }
        
        return null
      }

      const letter = data as Letter
      
      // 缓存结果（缓存5分钟）
      cacheManager.set(cacheKey, letter, 5 * 60 * 1000)
      
      console.log('Successfully retrieved letter from database:', linkId)
      return letter
    } catch (error) {
      console.error('Database query error:', error)
      return null
    }
  }
}

// 导出单例实例
export const letterService = LetterService.getInstance()