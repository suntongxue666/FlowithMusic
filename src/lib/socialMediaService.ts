import { supabase } from './supabase'

// 检查supabase客户端是否可用
const checkSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }
  return supabase
}

export interface SocialMediaAccount {
  id?: string
  user_id: string
  platform: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'spotify'
  username: string
  url?: string
  created_at?: string
  updated_at?: string
}

export interface SocialMediaData {
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  spotify?: string
}

export const socialMediaService = {
  // 获取用户的所有社交媒体账号
  async getUserSocialMedia(userId: string): Promise<SocialMediaAccount[]> {
    try {
      const client = checkSupabaseClient()
      const { data, error } = await client
        .from('user_social_media')
        .select('*')
        .eq('user_id', userId)
        .order('platform')

      if (error) {
        console.error('获取社交媒体账号失败:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('获取社交媒体账号异常:', error)
      throw error
    }
  },

  // 获取用户的社交媒体账号（以对象形式返回）
  async getUserSocialMediaData(userId: string): Promise<SocialMediaData> {
    try {
      const accounts = await this.getUserSocialMedia(userId)
      const result: SocialMediaData = {}
      
      accounts.forEach(account => {
        result[account.platform] = account.username
      })
      
      return result
    } catch (error) {
      console.error('获取社交媒体数据异常:', error)
      return {}
    }
  },

  // 保存或更新用户的社交媒体账号
  async saveSocialMediaData(userId: string, data: SocialMediaData): Promise<void> {
    try {
      const client = checkSupabaseClient()
      const platforms: Array<keyof SocialMediaData> = ['instagram', 'twitter', 'tiktok', 'youtube', 'spotify']
      
      for (const platform of platforms) {
        const username = data[platform]
        
        if (username && username.trim()) {
          // 生成URL
          const url = this.generatePlatformUrl(platform, username.trim())
          
          // 使用upsert来插入或更新
          const { error } = await client
            .from('user_social_media')
            .upsert({
              user_id: userId,
              platform,
              username: username.trim(),
              url
            }, {
              onConflict: 'user_id,platform'
            })

          if (error) {
            console.error(`保存${platform}账号失败:`, error)
            throw error
          }
        } else {
          // 如果用户名为空，删除该平台的记录
          const { error } = await client
            .from('user_social_media')
            .delete()
            .eq('user_id', userId)
            .eq('platform', platform)

          if (error) {
            console.error(`删除${platform}账号失败:`, error)
            throw error
          }
        }
      }
    } catch (error) {
      console.error('保存社交媒体数据异常:', error)
      throw error
    }
  },

  // 生成平台URL
  generatePlatformUrl(platform: string, username: string): string {
    const cleanUsername = username.replace(/^@/, '') // 移除开头的@符号
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${cleanUsername}`
      case 'twitter':
        return `https://twitter.com/${cleanUsername}`
      case 'tiktok':
        return `https://tiktok.com/@${cleanUsername}`
      case 'youtube':
        return `https://youtube.com/@${cleanUsername}`
      case 'spotify':
        return `https://open.spotify.com/user/${cleanUsername}`
      default:
        return ''
    }
  },

  // 删除特定平台的账号
  async deleteSocialMediaAccount(userId: string, platform: string): Promise<void> {
    try {
      const client = checkSupabaseClient()
      const { error } = await client
        .from('user_social_media')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform)

      if (error) {
        console.error(`删除${platform}账号失败:`, error)
        throw error
      }
    } catch (error) {
      console.error('删除社交媒体账号异常:', error)
      throw error
    }
  }
}