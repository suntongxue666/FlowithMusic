'use client'

import { useState, useEffect, useCallback } from 'react'
import { userService } from '@/lib/userService'
import { supabase, User } from '@/lib/supabase'

interface UserState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 全局状态管理
let globalUserState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

let stateListeners: Set<(state: UserState) => void> = new Set()

// 状态更新函数
const updateGlobalState = (newState: Partial<UserState>) => {
  globalUserState = { ...globalUserState, ...newState }
  stateListeners.forEach(listener => listener(globalUserState))
}

// 初始化标记，确保只初始化一次
let isInitialized = false
let initializationPromise: Promise<void> | null = null

// 统一的用户状态初始化
const initializeUserState = async (): Promise<void> => {
  if (isInitialized || initializationPromise) {
    return initializationPromise || Promise.resolve()
  }

  initializationPromise = (async () => {
    console.log('🔄 useUserState: 开始统一初始化用户状态...')
    
    try {
      updateGlobalState({ isLoading: true, error: null })
      
      // 1. 优先检查localStorage
      let user: User | null = null
      
      if (typeof window !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('user')
          const storedAuth = localStorage.getItem('isAuthenticated')
          
          if (storedUser && storedAuth === 'true') {
            user = JSON.parse(storedUser)
            console.log('✅ useUserState: 从localStorage恢复用户:', {
              email: user?.email,
              id: user?.id,
              hasId: !!user?.id,
              userData: user
            })
            
            // 验证用户数据完整性
            if (user && user.email && user.id) {
              // 立即更新状态，避免竞态条件
              updateGlobalState({
                user,
                isAuthenticated: true,
                isLoading: false
              })

              // 🚀 新增：在后台静默同步最新数据，解决手动改数据库不更新的问题
              setTimeout(() => {
                syncUserWithServer(user!);
              }, 1000); // 延迟1秒，不抢占初始化资源
            } else {
              console.warn('⚠️ useUserState: localStorage用户数据不完整，需要重新获取')
              user = null
            }
          }
        } catch (parseError) {
          console.warn('⚠️ useUserState: localStorage解析失败:', parseError)
        }
      }
      
      // 2. 如果localStorage没有用户，尝试异步获取（但不阻塞UI）
      if (!user) {
        console.log('🔍 useUserState: localStorage无用户，异步获取...')
        
        try {
          // 设置较短超时，避免阻塞
          const userPromise = userService.getCurrentUserAsync()
          const timeoutPromise = new Promise<User | null>((_, reject) => 
            setTimeout(() => reject(new Error('用户获取超时')), 3000)
          )
          
          user = await Promise.race([userPromise, timeoutPromise])
          
          if (user) {
            console.log('✅ useUserState: 异步获取用户成功:', user.email)
            updateGlobalState({
              user,
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            updateGlobalState({
              user: null,
              isAuthenticated: false,
              isLoading: false
            })
          }
        } catch (error) {
          console.warn('⚠️ useUserState: 异步获取用户失败:', error)
          updateGlobalState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      isInitialized = true
      console.log('✅ useUserState: 用户状态初始化完成')
      
    } catch (error) {
      console.error('💥 useUserState: 初始化失败:', error)
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error)
      })
      isInitialized = true
    }
  })()
  
  return initializationPromise
}

/**
 * 🚀 后台同步函数：从服务端获取最新状态并更新
 */
const syncUserWithServer = async (currentUser: User) => {
  if (!supabase) return;
  
  try {
    console.log('🔄 useUserState: 后台同步开始...');
    const { data: latestUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single();
      
    if (latestUser && !error) {
      // 检查关键字段是否有变化
      const hasChanged = 
        latestUser.is_premium !== currentUser.is_premium || 
        latestUser.premium_until !== currentUser.premium_until ||
        latestUser.coins !== currentUser.coins ||
        latestUser.display_name !== currentUser.display_name;

      if (hasChanged) {
        console.log('✨ useUserState: 检测到服务端数据变化，正在更新...');
        updateGlobalState({ user: latestUser });
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(latestUser));
        }
      } else {
        console.log('✅ useUserState: 服务端数据一致，无需更新');
      }
    }
  } catch (e) {
    console.warn('⚠️ useUserState: 后台同步异常', e);
  }
};

// 用户状态Hook
export const useUserState = () => {
  const [state, setState] = useState<UserState>(globalUserState)
  
  useEffect(() => {
    // 添加监听器
    stateListeners.add(setState)
    
    // 如果还未初始化，开始初始化
    if (!isInitialized) {
      initializeUserState()
    }
    
    return () => {
      stateListeners.delete(setState)
    }
  }, [])
  
  // 手动刷新用户状态
  const refreshUserState = useCallback(async () => {
    console.log('🔄 useUserState: 手动刷新用户状态...')
    updateGlobalState({ isLoading: true, error: null })
    
    try {
      const user = await userService.getCurrentUserAsync()
      updateGlobalState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null
      })
    } catch (error) {
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }, [])
  
  // 更新用户信息
  const updateUser = useCallback((user: User | null) => {
    updateGlobalState({
      user,
      isAuthenticated: !!user,
      error: null
    })
    
    // 同步到localStorage
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('isAuthenticated', 'true')
      } else {
        localStorage.removeItem('user')
        localStorage.removeItem('isAuthenticated')
      }
    }
  }, [])
  
  // 登出
  const signOut = useCallback(async () => {
    updateGlobalState({ isLoading: true })
    
    try {
      await userService.signOut()
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('登出失败:', error)
      // 即使登出失败，也清除本地状态
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
    }
  }, [])
  
  return {
    ...state,
    refreshUserState,
    updateUser,
    signOut
  }
}

// 导出全局状态访问函数（用于非React组件）
export const getCurrentGlobalUserState = () => globalUserState

// 重置状态（用于测试或特殊情况）
export const resetUserState = () => {
  isInitialized = false
  initializationPromise = null
  updateGlobalState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })
}