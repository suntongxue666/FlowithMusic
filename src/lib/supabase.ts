import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 详细的环境变量检查
console.log('Supabase configuration check:', {
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
  key: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING',
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are not configured properly:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey
  })
}

// 创建Supabase客户端，增强配置
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'flowithmusic-web'
        },
        fetch: (url, options = {}) => {
          // 增强的fetch实现绕过浏览器扩展
          const urlString = typeof url === 'string' ? url : url.toString()
          console.log('Supabase fetch request:', urlString.substring(0, 50) + '...')
          
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'FlowithMusic/1.0'
            },
          }).then(response => {
            console.log('Supabase fetch response:', response.status, response.statusText)
            return response
          }).catch(error => {
            console.error('Supabase fetch error:', error)
            throw error
          })
        },
      },
    })
  : null

// 验证连接的辅助函数
export const testSupabaseConnection = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }
  
  try {
    const { data, error } = await supabase
      .from('letters')
      .select('count')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    console.log('✅ Supabase connection test successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error)
    throw error
  }
}

// 数据库类型定义
export interface User {
  id: string
  email?: string
  google_id?: string
  anonymous_id: string
  display_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  user_agent?: string
  social_media_info?: Record<string, any>
  coins: number
  is_premium: boolean
}

export interface Letter {
  id: string
  user_id?: string
  anonymous_id?: string
  link_id: string
  recipient_name: string
  message: string
  song_id: string
  song_title: string
  song_artist: string
  song_album_cover: string
  song_preview_url?: string
  song_spotify_url: string
  created_at: string
  updated_at: string
  view_count: number
  is_public: boolean
  shareable_link?: string // 包含数据的可分享链接
  user?: User // 关联用户信息
}

export interface AnonymousSession {
  id: string
  anonymous_id: string
  user_agent: string
  created_at: string
  linked_user_id?: string
}