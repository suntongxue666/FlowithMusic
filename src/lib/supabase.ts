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
  })
  : null

// 验证连接的辅助函数
export const testSupabaseConnection = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }

  try {
    const { error } = await supabase
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
  song_duration_ms?: number
  created_at: string
  updated_at: string
  view_count: number
  is_public: boolean
  effect_type?: string | null // 付费特效类型，如 'flowing_emoji'
  animation_config?: any // 特效配置，如 { emojis: ["🐶", "🐱"] }
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

export interface LetterView {
  id: string
  letter_link_id: string
  viewer_user_id?: string
  viewer_anonymous_id?: string
  viewer_display_name: string
  viewer_avatar_url?: string
  session_id?: string
  view_start_time?: string
  view_end_time?: string
  view_duration_seconds?: number
  page_visible_time_seconds?: number
  scroll_depth_percentage?: number
  interaction_count?: number
  user_agent: string
  ip_address: string
  referer_url?: string
  viewed_at: string
}

export interface LetterInteraction {
  id: string
  letter_link_id: string
  user_id?: string
  anonymous_id?: string
  user_display_name: string
  user_avatar_url?: string
  emoji: string
  emoji_label: string
  user_agent: string
  created_at: string
}