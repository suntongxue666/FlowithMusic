import { supabase, Letter } from './supabase'
import { userService } from './userService'

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
    duration_ms: number
  }
  animation_config?: {
    emojis: string[]
  }
}



export class LetterService {
  private static instance: LetterService

  private constructor() { }

  public static getInstance(): LetterService {
    if (!LetterService.instance) {
      LetterService.instance = new LetterService()
    }
    return LetterService.instance
  }

  /**
   * 创建 Letter
   * - 无论登录与否，都写入数据库
   * - 登录用户：关联 user_id
   * - 游客用户：只关联 anonymous_id
   */
  async createLetter(data: CreateLetterData): Promise<Letter> {
    const currentUser = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()

    // 1. 构造基础 Letter 对象
    const linkId = this.generateLinkId()

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // 0. 确保获取最新的 User ID (从 Supabase Auth 直接获取，防止 userService 状态滞后)
    let finalUserId = currentUser?.id || null;

    if (!finalUserId && supabase) {
      try {
        // 增加 2秒 超时，防止 await supabase.auth.getUser() 导致死锁或长时间等待
        console.log('🔍 LetterService: Checking Supabase Auth with timeout...')
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 2000));

        const { data: { user } } = await Promise.race([authPromise, timeoutPromise]) as any;

        if (user) {
          console.log('✅ LetterService: User loaded from Supabase Auth directly:', user.id)
          finalUserId = user.id
        }
      } catch (e) {
        console.warn('⚠️ LetterService: Failed to check for auth user (timeout or error):', e)
      }
    }

    // 2. 写入数据库（无论登录与否）
    console.log('📝 LetterService: Creating letter', finalUserId ? `(Auth user: ${finalUserId})` : '(Guest mode)')

    const { data: newLetter, error } = await supabase
      .from('letters')
      .insert({
        link_id: linkId,
        user_id: finalUserId,
        anonymous_id: anonymousId,
        recipient_name: data.to,
        message: data.message,
        song_id: data.song.id,
        song_title: data.song.title,
        song_artist: data.song.artist,
        song_album_cover: data.song.albumCover,
        song_preview_url: data.song.previewUrl,
        song_spotify_url: data.song.spotifyUrl,
        song_duration_ms: data.song.duration_ms,
        is_public: true,
        animation_config: data.animation_config || {}
      })
      .select()
      .single()

    if (error) {
      console.error('❌ LetterService: Database write failed:', error)
      throw new Error(`Failed to save letter: ${error.message}`)
    }

    console.log('✅ LetterService: Letter saved to DB:', {
      link_id: newLetter.link_id,
      user_id: newLetter.user_id,
      anonymous_id: newLetter.anonymous_id,
      is_public: newLetter.is_public,
      created_at: newLetter.created_at
    })
    return newLetter
  }

  /**
   * 获取 Letter 详情 (通过 link_id)
   * 用于 LetterPage 展示
   */
  async getLetter(linkId: string): Promise<Letter | null> {
    if (!supabase) return null

    // 1. 尝试从数据库获取
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('link_id', linkId)
      .single()

    if (error) {
      console.warn('⚠️ LetterService: Letter not found in DB or error:', error.message)
      return null
    }

    // 2. 增加浏览次数 (不阻塞返回)
    this.incrementViewCount(linkId).catch(err =>
      console.warn('Failed to increment view count:', err)
    )

    return data
  }

  /**
   * 增加浏览次数
   */
  private async incrementViewCount(linkId: string) {
    if (!supabase) return
    await supabase.rpc('increment_letter_view_count', { row_link_id: linkId })
  }

  /**
   * 获取用户的 Letters (仅 Database)
   * 用于 HistoryPage 的 "Synced" 部分
   */
  async getUserLetters(userId?: string, anonymousId?: string): Promise<Letter[]> {
    if (!supabase) return []

    let query = supabase
      .from('letters')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (anonymousId) {
      query = query.eq('anonymous_id', anonymousId)
    } else {
      return []
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ LetterService: Failed to fetch user letters for ID:', userId, error)
      return []
    }

    console.log(`📊 LetterService: Fetched ${data?.length || 0} letters for user: ${userId}`)
    return data || []
  }

  /**
   * 获取最近的公开 Letters
   * 用于首页轮播
   */
  async getRecentLetters(limit = 10): Promise<Letter[]> {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ LetterService: Failed to fetch recent letters:', error)
      return []
    }

    return data || []
  }

  /**
   * 获取热门歌手
   * 用于首页 Tag 推荐
   */
  async getPopularArtists(limit = 10): Promise<{ artist: string; count: number }[]> {
    // 暂时返回硬编码列表，带模拟计数
    const artists = [
      { artist: 'Taylor Swift', count: 156 },
      { artist: 'The Weeknd', count: 142 },
      { artist: 'Bruno Mars', count: 128 },
      { artist: 'Ariana Grande', count: 115 },
      { artist: 'Justin Bieber', count: 98 },
      { artist: 'Ed Sheeran', count: 87 },
      { artist: 'Drake', count: 76 },
      { artist: 'Billie Eilish', count: 65 },
      { artist: 'Adele', count: 54 },
      { artist: 'Coldplay', count: 43 },
      { artist: 'Beyoncé', count: 32 },
      { artist: 'Harry Styles', count: 28 }
    ]
    return artists.slice(0, limit)
  }

  /**
   * 搜索 Letters
   * 用于 Explore 页面搜索
   */
  async searchLetters(query: string, limit = 18, offset = 0): Promise<Letter[]> {
    if (!supabase) return []

    const safeQuery = (query || '').trim()
    if (!safeQuery) return []

    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .or(`recipient_name.ilike.%${safeQuery}%,song_title.ilike.%${safeQuery}%,song_artist.ilike.%${safeQuery}%,message.ilike.%${safeQuery}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ LetterService: Search failed:', error)
      return []
    }

    return data || []
  }

  /**
   * 获取公开 Letters 列表
   * 用于 Explore 页面浏览
   */
  async getPublicLetters(
    limit = 18,
    offset = 0,
    sortBy: 'created_at' | 'view_count' = 'created_at',
    filters?: { artist?: string }
  ): Promise<Letter[]> {
    if (!supabase) return []

    let query = supabase
      .from('letters')
      .select('*')
      .eq('is_public', true)

    //如果有特定歌手筛选
    if (filters?.artist) {
      query = query.eq('song_artist', filters.artist)
    }

    const { data, error } = await query
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ LetterService: Fetch public letters failed:', error)
      return []
    }

    return data || []
  }

  /**
   * 迁移游客数据到当前登录用户
   * @param localLetters 本地存储的 Letter 数组
   * @param userId 当前用户ID
   */
  async migrateGuestLetters(localLetters: any[], userId: string): Promise<{ success: number; fail: number }> {
    if (!supabase || !userId || !localLetters.length) return { success: 0, fail: 0 }

    let success = 0
    let fail = 0

    console.log(`🔄 LetterService: Starting migration of ${localLetters.length} letters for user ${userId}`)

    for (const letter of localLetters) {
      try {
        // 1. 检查是否存在 (通过 link_id)
        const { data: existing } = await supabase
          .from('letters')
          .select('id')
          .eq('link_id', letter.link_id)
          .single()

        if (existing) {
          console.log(`⚠️ LetterService: Letter ${letter.link_id} already exists, skipping.`)
          continue
        }

        // 2. 插入数据
        // 注意：我们不上传 'id'，让数据库自动生成 UUID，但保留 link_id
        // 同时关联当前 user_id
        const { error } = await supabase
          .from('letters')
          .insert({
            link_id: letter.link_id,
            user_id: userId,
            anonymous_id: letter.anonymous_id, // 保留原始匿名ID
            recipient_name: letter.recipient_name,
            message: letter.message,
            song_id: letter.song_id,
            song_title: letter.song_title,
            song_artist: letter.song_artist,
            song_album_cover: letter.song_album_cover,
            song_preview_url: letter.song_preview_url,
            song_spotify_url: letter.song_spotify_url,
            song_duration_ms: letter.song_duration_ms,
            is_public: letter.is_public ?? true,
            created_at: letter.created_at || new Date().toISOString()
            // view_count 会默认为 0
          })

        if (error) {
          console.error(`❌ LetterService: Failed to migrate letter ${letter.link_id}:`, error)
          fail++
        } else {
          success++
        }
      } catch (e) {
        console.error(`❌ LetterService: Exception migrating letter ${letter.link_id}:`, e)
        fail++
      }
    }

    console.log(`✅ LetterService: Migration complete. Success: ${success}, Fail: ${fail}`)
    return { success, fail }
  }

  /**
   * 更新 Letter 的付费状态 (解锁特效)
   */
  async updateLetterPaymentStatus(linkId: string, effectType: string): Promise<boolean> {
    if (!supabase) return false

    console.log(`💰 LetterService: Updating payment status for ${linkId} to ${effectType}`)

    const { error } = await supabase
      .from('letters')
      .update({
        effect_type: effectType,
        updated_at: new Date().toISOString()
      })
      .eq('link_id', linkId)

    if (error) {
      console.error('❌ LetterService: Failed to update payment status:', error)
      return false
    }

    return true
  }

  private generateLinkId(): string {
    const now = new Date()
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0')

    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let random = ''
    for (let i = 0; i < 8; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `${timestamp}${random}`
  }
}

export const letterService = LetterService.getInstance()