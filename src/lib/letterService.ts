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
   * - 登录用户：写入数据库，永远保存
   * - 游客用户：仅返回对象，由前端保存到 LocalStorage (Local Only Mode)
   */
  async createLetter(data: CreateLetterData): Promise<Letter> {
    const currentUser = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()

    // 1. 构造基础 Letter 对象
    const linkId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6)

    // 2. 游客模式 (Guest Mode) - 仅本地
    if (!currentUser) {
      console.log('📝 LetterService: Guest Mode - Creating local-only letter')

      // 返回一个符合 Letter 接口的对象，但不写入数据库
      // 前端 SendPage 会负责将其保存到 localStorage
      return {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        link_id: linkId,
        user_id: undefined, // undefined to match optional property
        anonymous_id: anonymousId || undefined,
        recipient_name: data.to,
        message: data.message,
        song_id: data.song.id,
        song_title: data.song.title,
        song_artist: data.song.artist,
        song_album_cover: data.song.albumCover,
        song_preview_url: data.song.previewUrl || undefined,
        song_spotify_url: data.song.spotifyUrl,
        view_count: 0,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() // Added to match interface
      }
    }

    // 3. 登录模式 (Auth Mode) - 写入数据库
    console.log('📝 LetterService: Auth Mode - Writing to database for user:', currentUser.id)

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data: newLetter, error } = await supabase
      .from('letters')
      .insert({
        link_id: linkId,
        user_id: currentUser.id,
        anonymous_id: anonymousId, // 仍记录 anonymous_id 以便追踪设备来源
        recipient_name: data.to,
        message: data.message,
        song_id: data.song.id,
        song_title: data.song.title,
        song_artist: data.song.artist,
        song_album_cover: data.song.albumCover,
        song_preview_url: data.song.previewUrl,
        song_spotify_url: data.song.spotifyUrl,
        is_public: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ LetterService: Database write failed:', error)
      throw new Error(`Failed to save letter: ${error.message}`)
    }

    console.log('✅ LetterService: Letter saved to DB:', newLetter.link_id)
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
  async getUserLetters(userId: string): Promise<Letter[]> {
    if (!supabase || !userId) return []

    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ LetterService: Failed to fetch user letters:', error)
      return []
    }

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

    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .or(`recipient_name.ilike.%${query}%,song_title.ilike.%${query}%,song_artist.ilike.%${query}%,message.ilike.%${query}%`)
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
}

export const letterService = LetterService.getInstance()