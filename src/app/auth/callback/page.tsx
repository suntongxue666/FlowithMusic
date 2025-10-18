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

        // 处理OAuth回调 - 首先检查URL中的认证参数
        console.log('🔍 AuthCallback: 检查URL参数...')
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const urlParams = new URLSearchParams(window.location.search)

        const accessToken = hashParams.get('access_token') || urlParams.get('access_token')
        const error = hashParams.get('error') || urlParams.get('error')
        const errorDescription = hashParams.get('error_description') || urlParams.get('error_description')

        if (error) {
          console.error('❌ AuthCallback: OAuth返回错误:', error, errorDescription)
          throw new Error(`OAuth认证失败: ${errorDescription || error}`)
        }

        if (accessToken) {
          console.log('✅ AuthCallback: 发现access_token，直接解析用户信息')

          // 直接从token解析用户信息，跳过Supabase会话处理
          try {
            const tokenParts = accessToken.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              console.log('🔍 AuthCallback: 解析到的用户信息:', {
                sub: payload.sub,
                email: payload.email,
                name: payload.user_metadata?.full_name || payload.name
              })

              if (payload.sub && payload.email) {
                const user = {
                  id: payload.sub,
                  email: payload.email,
                  user_metadata: {
                    full_name: payload.user_metadata?.full_name || payload.name,
                    avatar_url: payload.user_metadata?.avatar_url || payload.picture,
                    email: payload.email
                  }
                }

                console.log('✅ AuthCallback: 直接解析成功，跳过Supabase会话检查')

                // 直接调用userService处理用户数据 - 简化版
                console.log('🔄 AuthCallback: 调用userService处理用户数据...')

                try {
                  // 设置10秒超时
                  const userProcessPromise = userService.handleAuthCallback(user)
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('用户处理超时')), 10000)
                  )

                  const processedUser = await Promise.race([userProcessPromise, timeoutPromise]) as any

                  console.log('✅ AuthCallback: 用户处理完成:', {
                    id: processedUser.id,
                    email: processedUser.email,
                    display_name: processedUser.display_name
                  })

                  console.log('🎉 AuthCallback: 登录成功，即将重定向...')
                  router.push('/history?login=success')
                  return
                } catch (processError) {
                  console.warn('⚠️ AuthCallback: 用户处理失败，使用简化流程:', processError)

                  // 简化处理：直接保存基本用户信息到localStorage
                  const metadata = user.user_metadata as any
                  const simpleUser = {
                    id: user.id,
                    email: user.email,
                    display_name: metadata?.full_name || metadata?.name || user.email?.split('@')[0],
                    avatar_url: metadata?.avatar_url || metadata?.picture,
                    google_id: user.id,
                    anonymous_id: `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
                    coins: 100,
                    is_premium: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }

                  localStorage.setItem('user', JSON.stringify(simpleUser))
                  localStorage.setItem('isAuthenticated', 'true')

                  console.log('✅ AuthCallback: 简化登录完成，即将重定向...')
                  router.push('/history?login=success')
                  return
                }
              }
            }
          } catch (parseError) {
            console.warn('⚠️ 直接解析失败，使用原有流程:', parseError)
          }
        }

        // 尝试获取当前会话 - 减少超时时间
        console.log('🔍 AuthCallback: 获取当前会话...')

        let sessionData, sessionError
        try {
          // 减少超时时间到5秒，提高响应速度
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session获取超时')), 5000)
          )

          const result = await Promise.race([sessionPromise, timeoutPromise]) as any
          sessionData = result.data
          sessionError = result.error
        } catch (timeoutError) {
          console.warn('⚠️ AuthCallback: Session获取超时，尝试备用方法')
          sessionError = timeoutError
        }

        if (sessionError) {
          console.error('❌ AuthCallback: 获取会话失败:', sessionError)
          // 不要立即抛错，尝试备用方法
        }

        let user: any
        let session = sessionData?.session

        if (!session || sessionError) {
          console.warn('⚠️ AuthCallback: 没有有效会话或会话获取失败，尝试其他方法...')

          // 如果有access_token，尝试备用认证方法
          if (accessToken) {
            console.log('🔄 AuthCallback: 尝试通过access_token直接获取用户...')

            try {
              // 方法1: 尝试通过getUser获取
              const userPromise = supabase.auth.getUser()
              const userTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GetUser获取超时')), 5000)
              )

              const userResult = await Promise.race([userPromise, userTimeoutPromise]) as any

              if (userResult.data?.user && !userResult.error) {
                console.log('✅ AuthCallback: 通过getUser成功获取用户')
                user = userResult.data.user
              } else {
                throw new Error(userResult.error?.message || '获取用户信息失败')
              }
            } catch (getUserError) {
              console.warn('⚠️ AuthCallback: getUser方法失败，尝试手动解析token')

              // 方法2: 手动解析access_token (兜底方案)
              try {
                // 解析JWT token获取用户信息
                const tokenParts = accessToken.split('.')
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]))
                  console.log('🔍 AuthCallback: 从token解析到用户信息:', payload)

                  if (payload.sub && payload.email) {
                    user = {
                      id: payload.sub,
                      email: payload.email,
                      user_metadata: {
                        full_name: payload.user_metadata?.full_name || payload.name,
                        avatar_url: payload.user_metadata?.avatar_url || payload.picture,
                        email: payload.email
                      }
                    }
                    console.log('✅ AuthCallback: 手动解析token成功')
                  } else {
                    throw new Error('Token中缺少必要的用户信息')
                  }
                } else {
                  throw new Error('Token格式无效')
                }
              } catch (parseError) {
                console.error('❌ AuthCallback: 手动解析token失败:', parseError)
                throw new Error('无法获取用户信息，所有方法都失败了')
              }
            }
          } else {
            throw new Error('认证会话无效且无access_token，请重新登录')
          }
        } else {
          console.log('✅ AuthCallback: 会话验证成功')
          user = session.user
        }

        // 调用userService处理用户数据和迁移 - 添加超时处理
        console.log('🔄 AuthCallback: 调用userService处理用户数据...')

        // 设置15秒超时
        const userProcessPromise = userService.handleAuthCallback(user)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('用户数据处理超时')), 15000)
        )

        const processedUser = await Promise.race([userProcessPromise, timeoutPromise]) as any

        console.log('✅ AuthCallback: 用户处理完成:', {
          id: processedUser.id,
          email: processedUser.email,
          display_name: processedUser.display_name,
          avatar_url: processedUser.avatar_url,
          anonymous_id: processedUser.anonymous_id
        })

        console.log('🎉 AuthCallback: 登录成功，即将重定向...')

        // 等待一下确保数据保存完成
        await new Promise(resolve => setTimeout(resolve, 500))

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

    // 减少延迟到200ms，加快响应
    const timeoutId = setTimeout(handleAuthCallback, 200)

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