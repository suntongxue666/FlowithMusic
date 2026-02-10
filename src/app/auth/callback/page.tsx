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

      try {
        if (!supabase) {
          throw new Error('Supabase客户端未初始化')
        }

        // 1. 获取认证会话
        console.log('🔍 AuthCallback: 获取当前会话...')

        // 尝试从URL hash获取token (Implicit Grant)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const error = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        if (error) {
          throw new Error(`OAuth认证失败: ${errorDescription || error}`)
        }

        let user: any

        if (accessToken) {
          console.log('✅ AuthCallback: 发现access_token，尝试获取用户信息')
          const { data, error } = await supabase.auth.getUser(accessToken)
          if (error || !data.user) {
            console.warn('⚠️ getUser失败，尝试解析token:', error)
            // 降级：手动解析JWT
            const tokenParts = accessToken.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              user = {
                id: payload.sub,
                email: payload.email,
                user_metadata: {
                  full_name: payload.user_metadata?.full_name || payload.name,
                  avatar_url: payload.user_metadata?.avatar_url || payload.picture,
                  email: payload.email
                }
              }
            }
          } else {
            user = data.user
          }
        } else {
          // 尝试获取现有会话 (PKCE Flow)
          const { data, error } = await supabase.auth.getUser()
          if (error || !data.user) {
            throw new Error('无法获取用户信息，请重试登录')
          }
          user = data.user
        }

        if (!user || (!user.id && !user.sub)) {
          throw new Error('无效的用户信息')
        }

        // 2. 调用统一的 UserService 处理逻辑
        // 这将负责：确保用户存在于数据库(修复FK)、更新本地状态、尝试迁移匿名数据
        console.log('🔄 AuthCallback: 调用 userService.handleAuthCallback...')

        // 设置20秒超时，因为可能涉及数据库写入和重试
        const userProcessPromise = userService.handleAuthCallback(user)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('用户数据同步超时')), 20000)
        )

        const processedUser = await Promise.race([userProcessPromise, timeoutPromise]) as any

        console.log('✅ AuthCallback: 用户处理完成，ID:', processedUser.id)
        console.log('🎉 AuthCallback: 登录成功，即将重定向...')

        // 3. 重定向
        router.push('/history?login=success')

      } catch (err: any) {
        console.error('💥 AuthCallback: 回调处理出错:', err)
        setError(err.message || '登录处理失败，请重试')
        setTimeout(() => {
          router.push('/history?login=error')
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    // 延迟执行确保Supabase环境就绪
    const timeoutId = setTimeout(handleAuthCallback, 500)
    return () => clearTimeout(timeoutId)
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>Verifying Login...</h2>
          <p>Please wait while we process your Google login information</p>
          <p className="auth-notice">🔐 Establishing secure connection</p>
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
          <h2>Login Failed</h2>
          <p>{error}</p>
          <p>Redirecting to homepage...</p>

          <button onClick={() => router.push('/')} className="retry-btn">
            Back to Home
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
        <h2>Login Successful!</h2>
        <p>Preparing your personalized experience...</p>
        <p>Redirecting to your history page</p>
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
          <h2>Loading...</h2>
          <p>Please wait while we process your login information</p>
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