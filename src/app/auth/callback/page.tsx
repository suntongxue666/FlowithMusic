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
          console.log('✅ AuthCallback: 发现access_token，等待Supabase处理...')
          // 给Supabase足够时间处理URL中的token
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // 尝试获取当前会话
        console.log('🔍 AuthCallback: 获取当前会话...')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ AuthCallback: 获取会话失败:', sessionError)
          throw new Error(`认证失败: ${sessionError.message}`)
        }

        let user: any
        let session = sessionData.session
        
        if (!session) {
          console.warn('⚠️ AuthCallback: 没有有效会话，尝试其他方法...')
          
          // 如果有access_token但没有会话，尝试通过Supabase处理当前URL
          if (accessToken) {
            console.log('🔄 AuthCallback: 尝试通过URL处理认证...')
            const { data: authData, error: authError } = await supabase.auth.getUser()
            
            if (authError) {
              console.error('❌ AuthCallback: 通过URL获取用户失败:', authError)
              throw new Error(`认证失败: ${authError.message}`)
            }
            
            if (authData.user) {
              console.log('✅ AuthCallback: 通过URL成功获取用户')
              user = authData.user
            } else {
              throw new Error('无法获取用户信息，请重新登录')
            }
          } else {
            throw new Error('认证会话无效，请重新登录')
          }
        } else {
          console.log('✅ AuthCallback: 会话验证成功')
          user = session.user
        }
        
        // 调用userService处理用户数据和迁移
        console.log('🔄 AuthCallback: 调用userService处理用户数据...')
        const processedUser = await userService.handleAuthCallback(user)
        
        console.log('✅ AuthCallback: 用户处理完成:', {
          id: processedUser.id,
          email: processedUser.email,
          display_name: processedUser.display_name
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