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
          console.warn('Supabase not configured, redirecting to history')
          router.push('/history')
          return
        }

        // 处理OAuth回调
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          throw new Error(`认证失败: ${error.message}`)
        }

        if (data.session?.user) {
          console.log('User authenticated:', data.session.user.email)
          
          // 处理用户数据迁移和创建
          await userService.handleAuthCallback(data.session.user)
          
          // 登录成功，重定向到历史页面
          router.push('/history')
        } else {
          console.warn('No session found, redirecting to history')
          // 没有会话，重定向到历史页面
          router.push('/history')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        const errorMessage = err instanceof Error ? err.message : '登录过程中发生未知错误'
        setError(errorMessage)
        
        // 5秒后重定向到历史页面
        setTimeout(() => {
          router.push('/history')
        }, 5000)
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
          <div className="error-icon">⚠️</div>
          <h2>登录失败</h2>
          <p>{error}</p>
          <p>将在5秒后自动返回历史页面...</p>
          <button 
            onClick={() => router.push('/history')}
            className="retry-btn"
          >
            立即返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <div className="success-icon">✅</div>
        <h2>登录成功！</h2>
        <p>正在为您准备个人化体验...</p>
        <p>即将跳转到历史页面</p>
      </div>
    </div>
  )
}