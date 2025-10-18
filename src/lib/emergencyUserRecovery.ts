// 紧急用户状态恢复机制
// 当数据库连接超时时，使用localStorage和基本认证信息快速恢复用户状态

import { supabase, User } from './supabase'

export class EmergencyUserRecovery {
  private static instance: EmergencyUserRecovery
  
  static getInstance(): EmergencyUserRecovery {
    if (!EmergencyUserRecovery.instance) {
      EmergencyUserRecovery.instance = new EmergencyUserRecovery()
    }
    return EmergencyUserRecovery.instance
  }

  // 快速恢复用户状态，不依赖数据库查询
  async quickRecoverUser(): Promise<User | null> {
    console.log('🚨 EmergencyUserRecovery: 开始快速用户恢复...')
    
    try {
      // 1. 首先检查localStorage
      const storedUser = localStorage.getItem('user')
      const storedAuth = localStorage.getItem('isAuthenticated')
      
      if (storedUser && storedAuth === 'true') {
        try {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser && parsedUser.email) {
            console.log('✅ EmergencyUserRecovery: 从localStorage恢复用户:', parsedUser.email)
            return parsedUser
          }
        } catch (parseError) {
          console.warn('⚠️ EmergencyUserRecovery: localStorage解析失败:', parseError)
        }
      }

      // 2. 如果localStorage没有，尝试从Supabase Auth获取基本信息（设置极短超时）
      if (supabase) {
        try {
          console.log('🔍 EmergencyUserRecovery: 尝试快速获取Auth用户...')
          
          // 设置1秒超时，快速失败
          const authPromise = supabase.auth.getUser()
          const quickTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('快速Auth查询超时')), 1000)
          )
          
          const authResult = await Promise.race([authPromise, quickTimeout]) as any
          const { data: { user: authUser }, error } = authResult
          
          if (!error && authUser) {
            console.log('✅ EmergencyUserRecovery: 快速获取Auth用户成功:', authUser.email)
            
            // 创建基本用户对象
            const basicUser: User = {
              id: authUser.id,
              email: authUser.email,
              google_id: authUser.id,
              display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0],
              avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
              anonymous_id: `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
              created_at: authUser.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              coins: 100, // 默认积分
              is_premium: false,
              social_media_info: authUser.user_metadata || {}
            }
            
            // 立即保存到localStorage
            localStorage.setItem('user', JSON.stringify(basicUser))
            localStorage.setItem('isAuthenticated', 'true')
            
            console.log('💾 EmergencyUserRecovery: 基本用户信息已保存到localStorage')
            return basicUser
          }
        } catch (authError) {
          console.warn('⚠️ EmergencyUserRecovery: 快速Auth查询失败:', authError)
        }
      }

      console.log('📱 EmergencyUserRecovery: 无法恢复用户状态')
      return null
      
    } catch (error) {
      console.error('💥 EmergencyUserRecovery: 恢复过程异常:', error)
      return null
    }
  }

  // 快速获取用户的letters，优先使用localStorage
  async quickGetUserLetters(user: User): Promise<any[]> {
    console.log('🚨 EmergencyUserRecovery: 快速获取用户letters...')
    
    try {
      // 从localStorage获取letters
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      console.log('📱 EmergencyUserRecovery: localStorage中的letters:', localLetters.length)
      
      if (localLetters.length === 0) {
        console.log('📭 EmergencyUserRecovery: localStorage中无letters')
        return []
      }
      
      // 过滤用户相关的letters
      const userLetters = localLetters.filter((letter: any) => {
        // 匹配user_id或anonymous_id
        return letter.user_id === user.id || 
               (user.anonymous_id && letter.anonymous_id === user.anonymous_id) ||
               (!letter.user_id && letter.anonymous_id === user.anonymous_id)
      })
      
      console.log(`📋 EmergencyUserRecovery: 过滤出${userLetters.length}个用户letters`)
      
      // 按时间排序
      const sortedLetters = userLetters.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      return sortedLetters
      
    } catch (error) {
      console.error('💥 EmergencyUserRecovery: 获取letters失败:', error)
      return []
    }
  }

  // 检查是否需要紧急恢复
  shouldUseEmergencyRecovery(): boolean {
    // 检查是否有数据库连接问题的标记
    const hasDbError = localStorage.getItem('supabase_auth_error')
    const lastDbTimeout = localStorage.getItem('last_db_timeout')
    
    // 如果最近5分钟内有数据库超时，使用紧急恢复
    if (lastDbTimeout) {
      const timeoutTime = parseInt(lastDbTimeout)
      const now = Date.now()
      if (now - timeoutTime < 5 * 60 * 1000) { // 5分钟内
        console.log('🚨 EmergencyUserRecovery: 检测到最近的数据库超时，启用紧急恢复')
        return true
      }
    }
    
    return !!hasDbError
  }

  // 标记数据库超时
  markDatabaseTimeout(): void {
    localStorage.setItem('last_db_timeout', Date.now().toString())
    localStorage.setItem('supabase_auth_error', 'timeout')
    console.log('🚨 EmergencyUserRecovery: 已标记数据库超时')
  }

  // 清除紧急恢复标记
  clearEmergencyFlags(): void {
    localStorage.removeItem('last_db_timeout')
    localStorage.removeItem('supabase_auth_error')
    console.log('✅ EmergencyUserRecovery: 已清除紧急恢复标记')
  }
}

export const emergencyUserRecovery = EmergencyUserRecovery.getInstance()