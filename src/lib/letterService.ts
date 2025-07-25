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
    
    // 如果Supabase不可用，使用localStorage作为fallback
    if (!supabase) {
      console.warn('Supabase not available, using localStorage fallback')
      
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
      
      // 保存到localStorage
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      existingLetters.push(fallbackLetter)
      localStorage.setItem('letters', JSON.stringify(existingLetters))
      
      return fallbackLetter
    }

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
        console.error('Failed to create letter:', error)
        
        // 如果Supabase失败，使用localStorage作为fallback
        console.warn('Supabase failed, falling back to localStorage')
        
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
        
        // 保存到localStorage
        const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        existingLetters.push(fallbackLetter)
        localStorage.setItem('letters', JSON.stringify(existingLetters))
        
        return fallbackLetter
      }

      return data
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
      
      // 保存到localStorage
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      existingLetters.push(fallbackLetter)
      localStorage.setItem('letters', JSON.stringify(existingLetters))
      
      return fallbackLetter
    }
  }

  // 根据linkId获取Letter
  async getLetterByLinkId(linkId: string): Promise<Letter | null> {
    // 如果Supabase不可用，从localStorage获取
    if (!supabase) {
      console.warn('Supabase not available, checking localStorage')
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      return existingLetters.find((letter: Letter) => letter.link_id === linkId) || null
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
        console.error('Failed to get letter:', error)
        // Fallback to localStorage
        const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        return existingLetters.find((letter: Letter) => letter.link_id === linkId) || null
      }

      // 增加浏览次数
      await this.incrementViewCount(data.id)

      return data
    } catch (networkError) {
      console.error('Network error, checking localStorage:', networkError)
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      return existingLetters.find((letter: Letter) => letter.link_id === linkId) || null
    }
  }

  // 增加浏览次数
  private async incrementViewCount(letterId: string): Promise<void> {
    if (!supabase) return
    await supabase.rpc('increment_view_count', { letter_id: letterId })
  }

  // 获取用户的Letters
  async getUserLetters(limit: number = 10, offset: number = 0): Promise<Letter[]> {
    const user = userService.getCurrentUser()
    const anonymousId = userService.getAnonymousId()
    
    // 如果Supabase不可用，从localStorage获取
    if (!supabase) {
      console.warn('Supabase not available, checking localStorage')
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      // 过滤用户的Letters
      const userLetters = existingLetters.filter((letter: Letter) => {
        if (user) {
          return letter.user_id === user.id
        } else {
          return letter.anonymous_id === anonymousId
        }
      })
      
      // 按时间排序并分页
      return userLetters
        .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + limit)
    }

    if (!user && !anonymousId) {
      return []
    }

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
        
        return userLetters
          .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(offset, offset + limit)
      }

      return data || []
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
      
      return userLetters
        .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + limit)
    }
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

    return data || []
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
}

// 导出单例实例
export const letterService = LetterService.getInstance()