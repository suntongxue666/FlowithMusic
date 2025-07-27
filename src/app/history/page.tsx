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
              <p>登录后可以查看所有设备的Letters历史</p>
              <button onClick={handleSignIn} className="sign-in-prompt-btn">
                Sign in with Google
              </button>
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
          padding: 1.5rem;
          border-radius: 12px;
          margin: 1rem 0;
        }

        .auth-prompt p {
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .sign-in-prompt-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sign-in-prompt-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
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