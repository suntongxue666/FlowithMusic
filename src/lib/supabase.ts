import { createClient } from '@supabase/supabase-js'

// 确保在客户端运行时获取环境变量
const getSupabaseConfig = () => {
  // 直接使用硬编码的值，确保配置正确
  const supabaseUrl = 'https://oiggdnnehohoaycyiydn.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'

  console.log('🔧 Supabase配置检查:', {
    url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
    key: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING',
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })

  return { supabaseUrl, supabaseAnonKey }
}

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

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
          'X-Client-Info': 'flowithmusic-web',
          'apikey': supabaseAnonKey, // 明确添加API密钥
          'Authorization': `Bearer ${supabaseAnonKey}` // 添加Authorization头
        },
        fetch: (url, options = {}) => {
          // 增强的fetch实现，避免浏览器扩展干扰
          const urlString = typeof url === 'string' ? url : url.toString()
          console.log('🌐 Supabase fetch请求:', urlString.substring(0, 50) + '...')
          
          // 检查是否在浏览器环境中
          if (typeof window === 'undefined') {
            // 服务端环境，使用Node.js的fetch
            return fetch(url, {
              ...options,
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
              },
            }).then(response => {
              console.log('📡 Supabase fetch响应(服务端):', response.status, response.statusText)
              return response
            }).catch(error => {
              console.error('💥 Supabase fetch错误(服务端):', error)
              throw error
            })
          }
          
          // 客户端环境，创建一个新的fetch请求，避免被浏览器扩展劫持
          const originalFetch = window.fetch.bind(window)
          
          return originalFetch(url, {
            ...options,
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'FlowithMusic/1.0',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              ...options.headers,
            },
            mode: 'cors',
            credentials: 'same-origin',
          }).then(response => {
            console.log('📡 Supabase fetch响应(客户端):', response.status, response.statusText)
            if (!response.ok) {
              console.error('❌ Supabase请求失败:', {
                status: response.status,
                statusText: response.statusText,
                url: urlString
              })
            }
            return response
          }).catch(error => {
            // 检查是否是浏览器扩展干扰
            if (error.message.includes('Receiving end does not exist')) {
              console.warn('⚠️ 检测到浏览器扩展干扰，重试请求...')
              // 重试一次
              return originalFetch(url, {
                ...options,
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'Content-Type': 'application/json',
                  ...options.headers,
                },
              })
            }
            console.error('💥 Supabase fetch错误(客户端):', error)
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