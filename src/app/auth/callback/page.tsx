'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { userService } from '@/lib/userService'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 动态导入supabase以避免构建时错误
        const { supabase } = await import('@/lib/supabase')
        
        // 检查Supabase是否可用
        if (!supabase) {
          console.warn('Supabase not configured, redirecting to home')
          router.push('/')
          return
        }

        // 处理OAuth回调
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session?.user) {
          // 处理用户数据迁移和创建
          await userService.handleAuthCallback(data.session.user)
          
          // 登录成功，重定向到首页
          router.push('/')
        } else {
          // 没有会话，重定向到首页
          router.push('/')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : '登录失败')
        
        // 3秒后重定向到首页
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>正在登录中...</h2>
          <p>请稍候，我们正在处理您的登录信息</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content error">
          <h2>登录失败</h2>
          <p>{error}</p>
          <p>将在3秒后自动返回首页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <h2>登录成功！</h2>
        <p>即将跳转到首页...</p>
      </div>
    </div>
  )
}