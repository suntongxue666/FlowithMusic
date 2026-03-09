import { createClient } from '@supabase/supabase-js'

// 直接硬编码配置，确保没有环境变量问题
const SUPABASE_URL = 'https://oiggdnnehohoaycyiydn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'

console.log('🔧 硬编码Supabase配置:', {
  url: SUPABASE_URL.substring(0, 30) + '...',
  key: SUPABASE_ANON_KEY.substring(0, 20) + '...',
  hasUrl: !!SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY
})

// 创建Supabase客户端
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'flowithmusic-web',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    fetch: (url, options = {}) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      console.log('🌐 直接Supabase请求:', urlString.substring(0, 50) + '...')

      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        // 服务端环境
        return fetch(url, {
          ...options,
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
          },
        }).then(response => {
          console.log('📡 直接Supabase响应(服务端):', response.status, response.statusText)
          return response
        }).catch(error => {
          console.error('💥 直接Supabase错误(服务端):', error)
          throw error
        })
      }

      // 客户端环境
      const originalFetch = window.fetch.bind(window)

      return originalFetch(url, {
        ...options,
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
        mode: 'cors',
        credentials: 'same-origin',
      }).then(response => {
        console.log('📡 直接Supabase响应(客户端):', response.status, response.statusText)
        if (!response.ok) {
          const errorInfo = {
            status: response.status,
            statusText: response.statusText,
            url: urlString
          }
          console.error('❌ 直接Supabase请求失败:', errorInfo)

          // 如果是401错误，不要抛出异常，而是返回响应让上层处理
          if (response.status === 401) {
            console.warn('⚠️ 401错误，但继续处理响应')
            return response
          }
        }
        return response
      }).catch(error => {
        console.error('💥 直接Supabase错误(客户端):', error)
        throw error
      })
    },
  },
})

// 导出默认客户端（兼容性）
export const supabase = supabaseClient

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
  shareable_link?: string
  user?: User
  category?: string
}

export interface AnonymousSession {
  id: string
  anonymous_id: string
  user_agent: string
  created_at: string
  linked_user_id?: string
}

// 验证连接的辅助函数
export const testSupabaseConnection = async () => {
  if (!supabaseClient) {
    throw new Error('Supabase client is not initialized')
  }

  try {
    const { data, error } = await supabaseClient
      .from('letters')
      .select('count')
      .limit(1)

    if (error) {
      throw error
    }

    console.log('✅ 直接Supabase连接测试成功')
    return true
  } catch (error) {
    console.error('❌ 直接Supabase连接测试失败:', error)
    throw error
  }
}