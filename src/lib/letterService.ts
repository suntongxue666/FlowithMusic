import { supabase, Letter } from './supabase'
import { userService } from './userService'
import { fallbackStorage } from './fallbackStorage'
import { simpleStorage } from './simpleStorage'
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
    
    // 如果Supabase不可用，使用简单存储作为fallback
    if (!supabase) {
      console.warn('Supabase not available, using simple storage fallback')
      
      const fallbackLetter: Letter = {
        id: linkId,
        user_id: user?.id,
        anonymous_id: user ? undefined : (anonymousId || undefined),
        link_id: linkId,
        recipient_name: letterData.to.trim(),
        message: letterData.message.trim(),
        song_id: letterData.song.id,
        song_title: letterData.song.title,
        song_artist: letterData.song.artist,
        song_album_cover: letterData.song.albumCover,
        song_preview_url: letterData.song.previewUrl,
        song_spotify_url: letterData.song.spotifyUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: 0,
        is_public: true
      }
      
      // 保存到简单存储（可以被其他用户访问）
      createdLetter = await simpleStorage.saveLetter(fallbackLetter)
      
      // 同时保存到localStorage（用户本地缓存）
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      existingLetters.push(fallbackLetter)
      localStorage.setItem('letters', JSON.stringify(existingLetters))
    } else {
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
        is_public: true // 默认公开，后续可以添加隐私设置
      }

      console.log('Inserting letter data:', newLetter)

      try {
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

        if (error) {
          console.error('Failed to create letter in Supabase:', error)
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          
          // 如果Supabase失败，使用备用存储
          console.warn('Supabase failed, falling back to alternative storage')
          
          const fallbackLetter: Letter = {
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
          
          // 保存到简单存储（可以被其他用户访问）
          createdLetter = await simpleStorage.saveLetter(fallbackLetter)
          
          // 同时保存到localStorage（用户本地访问）
          const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          existingLetters.push(fallbackLetter)
          localStorage.setItem('letters', JSON.stringify(existingLetters))
        } else {
          createdLetter = data
        }
      } catch (networkError) {
        console.error('Network error, using localStorage fallback:', networkError)
        
        const fallbackLetter: Letter = {
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
        
        // 保存到简单存储
        createdLetter = await simpleStorage.saveLetter(fallbackLetter)
        
        // 同时保存到localStorage
        const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        existingLetters.push(fallbackLetter)
        localStorage.setItem('letters', JSON.stringify(existingLetters))
      }
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

  // 获取用户的Letters
  async getUserLetters(limit: number = 10, offset: number = 0): Promise<Letter[]> {
    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()
    
    // 生成缓存键
    const cacheKey = cacheManager.generateKey('user_letters', {
      userId: user?.id || 'anonymous',
      anonymousId: anonymousId || 'none',
      limit,
      offset
    })
    
    // 尝试从缓存获取
    const cachedData = cacheManager.get(cacheKey)
    if (cachedData) {
      console.log('Using cached user letters:', cachedData.length)
      return cachedData
    }
    
    console.log('getUserLetters called with:', {
      user: user?.id,
      anonymousId,
      supabaseAvailable: !!supabase
    })
    
    let letters: Letter[] = []
    
    // 如果Supabase不可用，从localStorage获取
    if (!supabase) {
      console.warn('Supabase not available, checking localStorage')
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      console.log('Found letters in localStorage:', existingLetters.length)
      
      // 过滤用户的Letters
      const userLetters = existingLetters.filter((letter: Letter) => {
        if (user) {
          return letter.user_id === user.id
        } else {
          return letter.anonymous_id === anonymousId
        }
      })
      
      console.log('Filtered user letters:', userLetters.length)
      
      // 按时间排序并分页
      letters = userLetters
        .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + limit)
    } else {
      if (!user && !anonymousId) {
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

          if (user) {
            query = query.eq('user_id', user.id)
          } else {
            query = query.eq('anonymous_id', anonymousId)
          }

          const { data, error } = await query

          if (error) {
            console.error('Failed to get user letters:', error)
            // Fallback to localStorage
            const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            const userLetters = existingLetters.filter((letter: Letter) => {
              if (user) {
                return letter.user_id === user.id
              } else {
                return letter.anonymous_id === anonymousId
              }
            })
            
            letters = userLetters
              .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(offset, offset + limit)
          } else {
            letters = data || []
          }
        } catch (networkError) {
          console.error('Network error, checking localStorage:', networkError)
          const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const userLetters = existingLetters.filter((letter: Letter) => {
            if (user) {
              return letter.user_id === user.id
            } else {
              return letter.anonymous_id === anonymousId
            }
          })
          
          letters = userLetters
            .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(offset, offset + limit)
        }
      }
    }
    
    // 缓存结果（缓存3分钟）
    cacheManager.set(cacheKey, letters, 3 * 60 * 1000)
    
    return letters
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
    
    let letters: Letter[] = []
    
    // 1. 优先从Supabase获取
    if (supabase) {
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

        if (!error && data) {
          letters = data || []
          console.log(`✅ Got ${letters.length} letters from Supabase`)
        } else {
          console.error('Supabase query failed:', error)
        }
      } catch (error) {
        console.error('Supabase connection failed:', error)
      }
    }
    
    // 2. 从fallback存储获取补充数据
    try {
      const fallbackLetters = await simpleStorage.getPublicLetters(limit * 2) // 获取更多数据用于合并
      console.log(`📦 Got ${fallbackLetters.length} letters from fallback storage`)
      
      // 合并数据，去重（优先Supabase数据）
      const existingLinkIds = new Set(letters.map(l => l.link_id))
      const newLetters = fallbackLetters.filter(l => !existingLinkIds.has(l.link_id))
      
      letters = [...letters, ...newLetters]
      console.log(`🔗 Merged total: ${letters.length} letters`)
    } catch (error) {
      console.error('Fallback storage query failed:', error)
    }
    
    // 3. 应用客户端过滤和排序
    if (filterBy?.artist) {
      letters = letters.filter(letter => 
        letter.song_artist.toLowerCase().includes(filterBy.artist!.toLowerCase())
      )
    }
    
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
      
      letters = letters.filter(letter => 
        new Date(letter.created_at) >= startDate
      )
    }
    
    // 排序
    letters.sort((a, b) => {
      if (sortBy === 'view_count') {
        return (b.view_count || 0) - (a.view_count || 0)
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    
    // 分页
    letters = letters.slice(offset, offset + limit)
    
    console.log(`📊 Final result: ${letters.length} public letters after filtering and pagination`)
    
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
        const letter = await simpleStorage.getLetter(linkId)
        if (letter) {
          console.log('Found letter in simple storage:', linkId)
          // 缓存结果（缓存5分钟）
          cacheManager.set(cacheKey, letter, 5 * 60 * 1000)
          return letter
        }
      } catch (error) {
        console.error('Failed to get letter from simple storage:', error)
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
        .single()

      if (error) {
        console.error('Failed to get letter by linkId:', error)
        
        // 如果Supabase查询失败，尝试从简单存储获取
        try {
          const letter = await simpleStorage.getLetter(linkId)
          if (letter) {
            console.log('Found letter in simple storage as fallback:', linkId)
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