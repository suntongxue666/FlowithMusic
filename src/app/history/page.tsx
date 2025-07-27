'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { Letter } from '@/lib/supabase'

export default function HistoryPage() {
  const router = useRouter()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const initializeAndLoadLetters = async () => {
      try {
        console.log('🔄 HistoryPage: 初始化用户和加载Letters...')
        
        // 初始化用户服务
        await userService.initializeUser()
        
        // 获取当前用户状态
        const currentUser = userService.getCurrentUser()
        const isAuth = userService.isAuthenticated()
        
        setUser(currentUser)
        setIsAuthenticated(isAuth)
        
        console.log('👤 HistoryPage: 用户状态:', {
          isAuthenticated: isAuth,
          userId: currentUser?.id,
          email: currentUser?.email,
          anonymousId: userService.getAnonymousId()
        })

        // 加载用户Letters
        await loadUserLetters()
        
        // 检查是否是登录成功回调
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('login') === 'success') {
          console.log('🎉 HistoryPage: 登录成功！')
          setShowToast(true)
          
          // 清理URL参数
          window.history.replaceState({}, document.title, window.location.pathname)
        }
        
      } catch (error) {
        console.error('❌ HistoryPage: 初始化失败:', error)
      }
    }

    const loadUserLetters = async () => {
      try {
        setLoading(true)
        
        // 使用letterService获取用户Letters
        console.log('📝 HistoryPage: 加载用户Letters...')
        const userLetters = await letterService.getUserLetters(50, 0) // 加载更多数据
        
        console.log(`✅ HistoryPage: 成功加载 ${userLetters.length} 条Letters`)
        setLetters(userLetters)
        
      } catch (error) {
        console.error('❌ HistoryPage: 加载Letters失败:', error)
        
        // 如果服务失败，尝试从localStorage获取
        console.log('🔄 HistoryPage: 尝试从本地存储获取...')
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        
        if (localLetters.length > 0) {
          // 过滤用户的Letters
          const currentUser = userService.getCurrentUser()
          const anonymousId = userService.getAnonymousId()
          
          let userLocalLetters: any[] = []
          
          if (currentUser) {
            // 认证用户：匹配user_id
            userLocalLetters = localLetters.filter((letter: any) => 
              letter.user_id === currentUser.id
            )
          } else {
            // 匿名用户：匹配anonymous_id
            userLocalLetters = localLetters.filter((letter: any) => 
              letter.anonymous_id === anonymousId
            )
          }
          
          const sortedLetters = userLocalLetters.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          
          setLetters(sortedLetters)
          console.log(`✅ HistoryPage: 从本地加载 ${sortedLetters.length} 条Letters`)
        }
      } finally {
        setLoading(false)
      }
    }

    initializeAndLoadLetters()
  }, [])

  const handleLetterClick = (linkId: string) => {
    router.push(`/letter/${linkId}`)
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const handleSignIn = async () => {
    try {
      console.log('🔗 HistoryPage: 开始登录...')
      await userService.signInWithGoogle()
    } catch (error: any) {
      console.error('💥 HistoryPage: 登录失败:', error)
      alert(`登录失败: ${error.message}`)
    }
  }

  return (
    <main>
      <Header currentPage="history" />
      <div className="history-container">
        <div className="history-header">
          <h1>Your Musical Letters</h1>
          {!isAuthenticated && (
            <div className="auth-prompt">
              <p>Sign in to sync your letters across all devices and never lose your musical memories</p>
              <button onClick={handleSignIn} className="google-sign-in-btn">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="auth-subtitle">Your letters will be safely stored and accessible from any device</p>
            </div>
          )}
          {isAuthenticated && user && (
            <div className="user-info">
              <p>欢迎回来，{user.display_name || user.email}！</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your letters...</p>
          </div>
        ) : letters.length === 0 ? (
          <div className="empty-state">
            <h3>No letters yet</h3>
            <p>You haven't created any musical letters yet.</p>
            <button onClick={() => router.push('/send')} className="create-first-btn">
              Create Your First Letter
            </button>
          </div>
        ) : (
          <div className="letters-grid">
            {letters.map((letter) => (
              <div 
                key={letter.id} 
                className="letter-card"
                onClick={() => handleLetterClick(letter.link_id)}
              >
                <div className="letter-preview">
                  <img src={letter.song_album_cover} alt={letter.song_title} />
                  <div className="letter-info">
                    <h3>{letter.recipient_name}</h3>
                    <p className="song-info">{letter.song_title} - {letter.song_artist}</p>
                    <p className="message-preview">{letter.message.substring(0, 100)}...</p>
                    <div className="letter-meta">
                      <span className="date">{new Date(letter.created_at).toLocaleDateString()}</span>
                      <span className="views">{letter.view_count} views</span>
                      {isAuthenticated && (
                        <span className="auth-badge">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showToast && (
        <Toast 
          message="登录成功！欢迎使用FlowithMusic" 
          isVisible={showToast}
          onClose={handleToastClose}
        />
      )}

      <style jsx>{`
        .history-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          min-height: calc(100vh - 80px);
        }

        .history-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .history-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .auth-prompt {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 2rem;
          border-radius: 16px;
          margin: 2rem 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .auth-prompt p {
          margin-bottom: 1.5rem;
          font-size: 1.2rem;
          line-height: 1.6;
          font-weight: 300;
        }

        .auth-subtitle {
          margin-top: 1rem !important;
          margin-bottom: 0 !important;
          font-size: 0.95rem !important;
          opacity: 0.9;
          font-weight: 300;
        }

        .google-sign-in-btn {
          background: white;
          color: #757575;
          border: 1px solid #dadce0;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .google-sign-in-btn:hover {
          background: #f8f9fa;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .google-sign-in-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .user-info {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          color: #333;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .create-first-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 1rem;
          transition: transform 0.2s ease;
        }

        .create-first-btn:hover {
          transform: translateY(-2px);
        }

        .letters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .letter-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .letter-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .letter-preview {
          display: flex;
          padding: 1rem;
        }

        .letter-preview img {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 1rem;
        }

        .letter-info {
          flex: 1;
          min-width: 0;
        }

        .letter-info h3 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          color: #333;
          font-weight: 600;
        }

        .song-info {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .message-preview {
          font-size: 0.85rem;
          color: #888;
          line-height: 1.4;
          margin-bottom: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .letter-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #999;
        }

        .auth-badge {
          color: #28a745;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .history-container {
            padding: 1rem;
          }

          .letters-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .letter-preview {
            flex-direction: column;
            text-align: center;
          }

          .letter-preview img {
            width: 100%;
            height: 200px;
            margin-right: 0;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </main>
  )
}