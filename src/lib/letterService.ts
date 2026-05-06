import { supabase, cachedSupabase, Letter, User } from './supabase'
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
  category?: string
  is_public?: boolean
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
        // 增加到 5秒 超时，防止 await supabase.auth.getUser() 导致死锁或长时间等待
        console.log('🔍 LetterService: Checking Supabase Auth with timeout...')
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 5000));

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

    // 构造插入数据
    // 注意: DB CHECK constraint `letters_owner_check` 要求 user_id 和 anonymous_id 只能设其一
    const insertData: any = {
      link_id: linkId,
      user_id: finalUserId || null,
      anonymous_id: finalUserId ? null : anonymousId,
      recipient_name: data.to,
      message: data.message,
      song_id: data.song.id,
      song_title: data.song.title,
      song_artist: data.song.artist,
      song_album_cover: data.song.albumCover,
      song_preview_url: data.song.previewUrl,
      song_spotify_url: data.song.spotifyUrl,
      song_duration_ms: data.song.duration_ms,
      is_public: data.is_public ?? true,
      category: data.category
    }

    // 仅当有有效的动画配置(emoji数组非空)时才添加字段
    // 修复: 之前的检查 Object.keys > 0 对于 { emojis: [] } 无效，导致Schema错误
    if (data.animation_config &&
      Array.isArray(data.animation_config.emojis) &&
      data.animation_config.emojis.length > 0) {
      insertData.animation_config = data.animation_config
      // 只有在确定有特效配置时，才可能尝试写入 effect_type，但为了安全起见（防止列缺失），这里暂不写入 effect_type
      // 如果确认数据库迁移已执行，可以取消注释：
      // insertData.effect_type = 'flowing_emoji' 
    }

    // 1.5 查重校验 (30分钟内，同一发送者，相似内容)
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 1800000).toISOString();
      const ownerFilter = finalUserId
        ? `user_id.eq.${finalUserId}`
        : `anonymous_id.eq.${anonymousId}`;

      // 获取近期的信件内容用于模糊对比
      const { data: recentLetters, error: checkError } = await supabase
        .from('letters')
        .select('id, message, recipient_name')
        .or(ownerFilter)
        .gt('created_at', thirtyMinutesAgo)
        .limit(10);

      if (checkError) {
        console.warn('⚠️ LetterService: Duplicate check failed (ignoring):', checkError);
      } else if (recentLetters && recentLetters.length > 0) {
        // 内容标准化：转小写、去标点、取前80个单词
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 80).join(' ');
        const newNorm = normalize(data.message);

        for (const existing of recentLetters) {
          const existingNorm = normalize(existing.message || '');
          if (!existingNorm || !newNorm) continue;

          // 计算共同词数占比（Jaccard相似度）
          const newWords = new Set(newNorm.split(' '));
          const existingWords = new Set(existingNorm.split(' '));
          const intersection = Array.from(newWords).filter(w => existingWords.has(w)).length;
          const union = new Set([...Array.from(newWords), ...Array.from(existingWords)]).size;
          const similarity = union > 0 ? intersection / union : 0;

          if (similarity >= 0.85) {
            console.warn(`⚠️ LetterService: Fuzzy duplicate detected (similarity: ${(similarity * 100).toFixed(1)}%)`);
            throw new Error('A letter with very similar content has already been published. Please check your History.');
          }
        }
      }
    } catch (e: any) {
      if (e.message?.includes('similar content') || e.message?.includes('same content')) throw e;
      console.warn('⚠️ LetterService: Error during duplicate check:', e);
    }

    let newLetter: Letter | null = null;
    let dbError = null;

    try {
      const { data, error } = await supabase
        .from('letters')
        .insert(insertData)
        .select()
        .single()

      newLetter = data;
      dbError = error;
    } catch (e) {
      dbError = e;
    }

    // Special handling for missing column error (Schema mismatch)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = dbError as any; // Cast to any to access error properties safely
    if (err && (
      err.message?.includes('animation_config') ||
      err.code === 'PGRST204' || // Columns not found
      JSON.stringify(err).includes('schema cache')
    )) {
      console.warn('⚠️ LetterService: Schema mismatch detected (animation_config missing?), retrying without it...');
      const fallbackData = { ...insertData };
      delete fallbackData.animation_config;

      const { data, error } = await supabase
        .from('letters')
        .insert(fallbackData)
        .select()
        .single();

      newLetter = data;
      dbError = error;
    }

    if (dbError) {
      const err = dbError as any;
      console.error('❌ LetterService: Database write failed:', dbError)
      throw new Error(`Failed to save letter: ${err.message || 'Unknown error'}`)
    }

    // Safety fallback: If select() returns null but no error (RLS issue?), construct a response
    const validLetter = newLetter || {
      ...insertData,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      view_count: 0,
    } as Letter

    console.log('✅ LetterService: Letter saved to DB:', {
      link_id: validLetter.link_id,
      user_id: validLetter.user_id,
      anonymous_id: validLetter.anonymous_id,
      is_public: validLetter.is_public,
      created_at: validLetter.created_at
    })
    return validLetter
  }

  /**
   * 获取 Letter 详情 (通过 link_id)
   * 用于 LetterPage 展示
   */
  async getLetter(linkId: string): Promise<Letter | null> {
    if (!supabase) return null

    // 1. 尝试从数据库获取 (走缓存)
    if (!cachedSupabase) return null

    const { data, error } = await cachedSupabase
      .from('letters')
      .select('*, user:users(id, display_name, avatar_url, is_premium)')
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
    if (!cachedSupabase) return []

    let query = cachedSupabase
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
   * 获取用户今天发送的 Letter 数量
   */
  async getTodayCount(userId?: string, anonymousId?: string): Promise<number> {
    if (!cachedSupabase) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    let query = cachedSupabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso)

    if (userId && anonymousId) {
      query = query.or(`user_id.eq.${userId},anonymous_id.eq.${anonymousId}`)
    } else if (userId) {
      query = query.eq('user_id', userId)
    } else if (anonymousId) {
      query = query.eq('anonymous_id', anonymousId)
    } else {
      return 0
    }

    const { count, error } = await query
    if (error) {
      console.error('❌ LetterService: Failed to fetch today count:', error)
      return 0
    }

    return count || 0
  }

  /**
   * 获取最近的公开 Letters
   * 用于首页轮播
   */
  async getRecentLetters(limit = 10): Promise<Letter[]> {
    if (!cachedSupabase) return []

    const { data, error } = await cachedSupabase
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
   * 获取热门歌手 (从数据库真实统计)
   * 用于首页 Tag 推荐和 \\\"Posts with Artist\\\" 入口
   */
  async getPopularArtists(limit = 20): Promise<{ artist: string; count: number }[]> {
    if (!cachedSupabase) return []

    // 1. 获取所有公开信件的歌手名
    const { data, error } = await cachedSupabase
      .from('letters')
      .select('song_artist')
      .eq('is_public', true)

    if (error || !data) {
      console.error('❌ LetterService: Failed to fetch artists for aggregation:', error)
      return []
    }

    // 2. 在 JS 中进行聚合统计
    const artistCounts: { [key: string]: number } = {}
    data.forEach(item => {
      const artist = item.song_artist
      if (artist) {
        artistCounts[artist] = (artistCounts[artist] || 0) + 1
      }
    })

    // 3. 转换为数组格式并进行排序和过滤
    const result = Object.entries(artistCounts)
      .map(([artist, count]) => ({ artist, count }))
      .filter(item => item.count >= 1) // 基础过滤，后续业务逻辑会再根据 minLettersCount 过滤
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return result
  }

  /**
   * 搜索 Letters
   * 用于 Explore 页面搜索
   */
  async searchLetters(query: string, limit = 18, offset = 0, includePrivate = false): Promise<Letter[]> {
    if (!cachedSupabase) return []

    const safeQuery = (query || '').trim()
    if (!safeQuery) return []

    let dbQuery = cachedSupabase
      .from('letters')
      .select('*')
      
    if (!includePrivate) {
      dbQuery = dbQuery.eq('is_public', true)
    }

    const { data, error } = await dbQuery
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
   * 按ID获取公开用户信息，包括通过ID或匿名ID
   */
  async getUserById(queryId: string): Promise<User | null> {
    if (!cachedSupabase) return null

    try {
      // 检查 user_id 或者 anonymous_id
      const { data, error } = await cachedSupabase
        .from('users')
        .select('*')
        .or(`id.eq.${queryId},anonymous_id.eq.${queryId}`)
        // 这里需要保证只返回一条
        .limit(1)

      if (error) {
        console.error('❌ getUserById 数据库错误:', error)
        return null
      }
      
      if (data && data.length > 0) {
        return data[0] as User
      }
      return null
    } catch (error) {
      console.error('💥 getUserById 异常:', error)
      return null
    }
  }

  /**
   * 获取近期的 Letters (带各类过滤)
   */
  async getPublicLetters(
    limit = 18,
    offset = 0,
    sortBy: 'created_at' | 'view_count' = 'created_at',
    filters?: { artist?: string; category?: string; includePrivate?: boolean }
  ): Promise<Letter[]> {
    if (!cachedSupabase) return []

    let query = cachedSupabase
      .from('letters')
      .select('*')

    if (!filters?.includePrivate) {
      query = query.eq('is_public', true)
    }

    //如果有特定歌手筛选
    if (filters?.artist) {
      query = query.eq('song_artist', filters.artist)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
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
   * 获取相同歌曲的 Letters
   */
  async getLettersBySong(songTitle: string, limit = 6, excludeId?: string): Promise<Letter[]> {
    if (!cachedSupabase) return []

    let query = cachedSupabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .eq('song_title', songTitle)

    if (excludeId) {
      query = query.neq('link_id', excludeId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ LetterService: Fetch letters by song failed:', error)
      return []
    }

    return data || []
  }

  /**
   * 获取相同分类的 Letters
   */
  async getLettersByCategory(category: string, limit = 6, excludeId?: string): Promise<Letter[]> {
    if (!cachedSupabase) return []

    let query = cachedSupabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .eq('category', category)

    if (excludeId) {
      query = query.neq('link_id', excludeId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ LetterService: Fetch letters by category failed:', error)
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
   * 先尝试更新数据库，如果失败则更新本地存储
   */
  async updateLetterPaymentStatus(linkId: string, effectType: string): Promise<boolean> {
    console.log(`💰 LetterService: Updating payment status for ${linkId} to ${effectType}`)

    // 先尝试更新数据库
    if (supabase) {
      const { error } = await supabase
        .from('letters')
        .update({
          effect_type: effectType,
          updated_at: new Date().toISOString()
        })
        .eq('link_id', linkId)

      if (!error) {
        console.log('✅ LetterService: Database updated successfully')
        // 同时更新本地存储
        this.updateLocalLetterPaymentStatus(linkId, effectType)
        return true
      }

      console.warn('⚠️ LetterService: Database update failed:', error.message)
    }

    // 如果数据库更新失败，只更新本地存储
    const localSuccess = this.updateLocalLetterPaymentStatus(linkId, effectType)

    if (localSuccess) {
      console.log('✅ LetterService: Local storage updated successfully (fallback)')
      return true
    }

    console.error('❌ LetterService: Failed to update payment status')
    return false
  }

  /**
   * 更新本地存储的 Letter 付费状态
   */
  private updateLocalLetterPaymentStatus(linkId: string, effectType: string): boolean {
    if (typeof window === 'undefined') return false

    try {
      const rawLetters = localStorage.getItem('letters')
      if (!rawLetters) return false

      const letters = JSON.parse(rawLetters)
      const index = letters.findIndex((l: any) => l.link_id === linkId)

      if (index !== -1) {
        letters[index].effect_type = effectType
        localStorage.setItem('letters', JSON.stringify(letters))
        console.log('✅ LetterService: Local letter payment status updated')
        return true
      }

      return false
    } catch (e) {
      console.error('❌ LetterService: Failed to update local storage:', e)
      return false
    }
  }

  /**
   * 切换 Letter 公开/私密状态
   */
  async toggleLetterVisibility(linkId: string, isPublic: boolean): Promise<boolean> {
    if (!supabase) return false

    console.log(`👁️ LetterService: Toggling visibility for ${linkId} to ${isPublic}`)

    // 1. 更新数据库
    const { error } = await supabase
      .from('letters')
      .update({
        is_public: isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('link_id', linkId)

    if (error) {
      console.error('❌ LetterService: Update visibility failed:', error)
    }

    // 2. 更新本地存储 (Guest letters)
    if (typeof window !== 'undefined') {
      try {
        const rawLetters = localStorage.getItem('letters')
        if (rawLetters) {
          const letters = JSON.parse(rawLetters)
          if (Array.isArray(letters)) {
            const index = letters.findIndex((l: any) => l && l.link_id === linkId)
            if (index !== -1) {
              letters[index].is_public = isPublic
              localStorage.setItem('letters', JSON.stringify(letters))
              console.log('✅ LetterService: Local visibility updated')
            }
          }
        }
        
        // 3. 清理缓存
        localStorage.removeItem('history_letters_cache')
      } catch (e) {
        console.warn('⚠️ LetterService: Failed to update local visibility:', e)
      }
    }

    return !error
  }

  /**
   * 删除 Letter
   */
  async deleteLetter(linkId: string): Promise<boolean> {
    if (!supabase) return false

    console.log(`🗑️ LetterService: Deleting letter ${linkId}`)

    // 1. 从数据库删除
    const { error } = await supabase
      .from('letters')
      .delete()
      .eq('link_id', linkId)

    if (error) {
      console.error('❌ LetterService: Delete from DB failed:', error)
      // 继续尝试清理本地存储，因为可能存在同步失败但在本地有的情况
    }

    // 2. 同时处理本地存储 (Guest letters)
    if (typeof window !== 'undefined') {
      try {
        const rawLetters = localStorage.getItem('letters')
        if (rawLetters) {
          const letters = JSON.parse(rawLetters)
          if (Array.isArray(letters)) {
            const filtered = letters.filter((l: any) => l && l.link_id !== linkId)
            if (letters.length !== filtered.length) {
              localStorage.setItem('letters', JSON.stringify(filtered))
              console.log('✅ LetterService: Local storage cleared')
            }
          }
        }
        
        // 3. 清理历史记录缓存，确保下次进入或刷新时由数据库重新获取
        localStorage.removeItem('history_letters_cache')
        localStorage.removeItem('history_letters_cache_time')
      } catch (e) {
        console.warn('⚠️ LetterService: Failed to clear local storage after delete:', e)
      }
    }

    return !error
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
