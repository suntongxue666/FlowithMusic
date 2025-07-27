'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

function AuthCallbackComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🚀 AuthCallback: 开始处理Google OAuth回调...')
      console.log('🔍 AuthCallback: 当前URL:', window.location.href)
      
      try {
        if (!supabase) {
          throw new Error('Supabase客户端未初始化')
        }

        // 处理OAuth回调 - 使用getSession来获取当前会话
        console.log('🔍 AuthCallback: 当前URL:', window.location.href)
        
        // 首先检查URL中是否有认证信息
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        
        if (accessToken) {
          console.log('✅ AuthCallback: 发现access_token，等待Supabase处理...')
          // 等待一下让Supabase处理URL中的token
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const { data, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          console.error('❌ AuthCallback: 获取会话失败:', authError)
          throw new Error(`认证失败: ${authError.message}`)
        }

        let user: any
        
        if (!data.session) {
          console.error('❌ AuthCallback: 没有有效会话')
          console.log('🔄 AuthCallback: 尝试刷新会话...')
          
          // 尝试刷新会话
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshData.session) {
            throw new Error('认证会话无效，请重新登录')
          }
          
          console.log('✅ AuthCallback: 会话刷新成功')
          user = await userService.handleAuthCallback(refreshData.session.user)
        } else {
          console.log('✅ AuthCallback: 会话验证成功')
          user = await userService.handleAuthCallback(data.session.user)
        }
        
        console.log('✅ AuthCallback: 用户处理完成:', {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        })

        console.log('🎉 AuthCallback: 登录成功，即将重定向...')
        
        // 重定向到历史页面
        router.push('/history?login=success')
        
      } catch (err: any) {
        console.error('💥 AuthCallback: 回调处理出错:', err)
        setError(err.message || '登录处理失败，请重试')
        
        // 等待3秒后重定向到主页
        setTimeout(() => {
          router.push('/history?login=error')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    // 延迟执行以显示加载状态
    const timeoutId = setTimeout(handleAuthCallback, 500)
    
    return () => clearTimeout(timeoutId)
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>正在验证登录...</h2>
          <p>请稍候，我们正在处理您的Google登录信息</p>
          <p className="auth-notice">🔐 正在建立安全连接</p>
        </div>
        
        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          .auth-notice {
            color: #666;
            font-size: 14px;
            margin-top: 1rem;
            font-style: italic;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content error">
          <div className="error-icon">❌</div>
          <h2>登录失败</h2>
          <p>{error}</p>
          <p>即将重定向到主页...</p>
          
          <button onClick={() => router.push('/')} className="retry-btn">
            返回主页
          </button>
        </div>
        
        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .error-icon {
            font-size: 48px;
            margin-bottom: 1rem;
          }
          
          .retry-btn {
            margin-top: 1rem;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          
          .retry-btn:hover {
            background-color: #0056b3;
          }
        `}</style>
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
      
      <style jsx>{`
        .auth-callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
        }
        
        .auth-callback-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
        }
        
        .success-icon {
          font-size: 48px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>正在加载...</h2>
          <p>请稍候，我们正在处理您的登录信息</p>
        </div>
        
        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <AuthCallbackComponent />
    </Suspense>
  )
}