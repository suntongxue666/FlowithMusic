'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/lib/supabase'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

interface UserContextType {
  user: User | null
  anonymousId: string | null
  loading: boolean
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<User>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [anonymousId, setAnonymousId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化用户状态
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const anonId = await userService.initializeUser()
        setAnonymousId(anonId)
        
        const currentUser = userService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('用户初始化失败:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [])

  // 监听认证状态变化
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const userData = await userService.handleAuthCallback(session.user)
            setUser(userData)
          } catch (error) {
            console.error('处理登录回调失败:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          // 重新初始化匿名用户
          const anonId = await userService.initializeUser()
          setAnonymousId(anonId)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      await userService.signInWithGoogle()
    } catch (error) {
      console.error('Google登录失败:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await userService.signOut()
      setUser(null)
      // 重新初始化匿名用户
      const anonId = await userService.initializeUser()
      setAnonymousId(anonId)
    } catch (error) {
      console.error('登出失败:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    try {
      const updatedUser = await userService.updateProfile(updates)
      setUser(updatedUser)
      return updatedUser
    } catch (error) {
      console.error('更新用户资料失败:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = userService.getCurrentUser()
      if (currentUser) {
        // 从数据库重新获取最新用户信息
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single()
        
        if (data) {
          setUser(data)
        }
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    }
  }

  const value: UserContextType = {
    user,
    anonymousId,
    loading,
    isAuthenticated: user !== null,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// Hook for using the user context
export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// HOC for protecting routes that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useUser()

    if (loading) {
      return (
        <div className="auth-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      )
    }

    if (!isAuthenticated) {
      if (fallback) {
        return React.createElement(fallback, props)
      }
      return (
        <div className="auth-required">
          <h2>需要登录</h2>
          <p>请先登录以访问此功能</p>
        </div>
      )
    }

    return React.createElement(Component, props)
  }
}