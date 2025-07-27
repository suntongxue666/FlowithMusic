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
    const loadLettersAndUser = async () => {
      try {
        setLoading(true)
        
        // Initialize user service
        await userService.initializeUser()
        
        // Get current user state
        const currentUser = userService.getCurrentUser()
        const isAuth = userService.isAuthenticated()
        
        console.log('History page - User state:', {
          isAuth,
          user: currentUser?.email,
          anonymousId: userService.getAnonymousId()
        })
        
        setUser(currentUser)
        setIsAuthenticated(isAuth)
        
        // Load letters based on authentication status
        let userLetters: Letter[] = []
        
        if (isAuth && currentUser) {
          // Authenticated user - get from database and migrate if needed
          try {
            userLetters = await letterService.getUserLetters(50, 0)
            console.log(`Loaded ${userLetters.length} letters for authenticated user`)
          } catch (error) {
            console.warn('Failed to load from database, falling back to localStorage:', error)
            // Fallback to localStorage
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            userLetters = localLetters.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          }
        } else {
          // Anonymous user - get from localStorage only
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const anonymousId = userService.getAnonymousId()
          
          // Filter by anonymous ID if available
          if (anonymousId) {
            userLetters = localLetters.filter((letter: any) => 
              letter.anonymous_id === anonymousId
            )
          } else {
            // Show all local letters if no anonymous ID
            userLetters = localLetters
          }
          
          userLetters = userLetters.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          
          console.log(`Loaded ${userLetters.length} letters for anonymous user`)
        }
        
        setLetters(userLetters)
        
        // Check for login success callback
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('login') === 'success') {
          console.log('Login successful, showing toast')
          setShowToast(true)
          
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Trigger letter migration for newly logged in user
          setTimeout(async () => {
            try {
              const updatedLetters = await letterService.getUserLetters(50, 0)
              setLetters(updatedLetters)
              console.log('Updated letters after login migration')
            } catch (error) {
              console.warn('Failed to reload letters after migration:', error)
            }
          }, 2000)
        }
        
      } catch (error) {
        console.error('Failed to initialize History page:', error)
        
        // Final fallback - just show localStorage contents
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const sortedLetters = localLetters.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setLetters(sortedLetters)
        
      } finally {
        setLoading(false)
      }
    }

    loadLettersAndUser()
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

  const copyToClipboard = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
    })
  }

  return (
    <main>
      <Header currentPage="history" />
      <div className="history-container">
        {/* Sign in section at top */}
        <div className="signin-section">
          <div className="user-avatar">
            {isAuthenticated && user ? (
              <img 
                src={user.avatar_url || '/default-avatar.png'} 
                alt="User Avatar"
                className="avatar-image"
              />
            ) : (
              <div className="default-avatar">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="39" fill="white" stroke="#ccc" strokeWidth="2"/>
                  <circle cx="40" cy="32" r="12" fill="none" stroke="#999" strokeWidth="2"/>
                  <path d="M20 65c0-11 9-20 20-20s20 9 20 20" fill="none" stroke="#999" strokeWidth="2"/>
                </svg>
              </div>
            )}
          </div>
          
          {!isAuthenticated && (
            <>
              <button className="google-signin-btn" onClick={handleSignIn}>
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="signin-description">
                Sign in to save your special Messages — the words and music that connect hearts.
              </p>
            </>
          )}
        </div>

        <div className="history-header">
          <h1>Your Message History</h1>
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
          <div className="letters-list">
            {letters.map((letter) => (
              <div key={letter.id} className="letter-item">
                <div className="letter-content" onClick={() => handleLetterClick(letter.link_id)}>
                  <img src={letter.song_album_cover} alt={letter.song_title} className="album-cover" />
                  <div className="letter-details">
                    <h3>To: {letter.recipient_name}</h3>
                    <p className="song-info">{letter.song_title} - {letter.song_artist}</p>
                    <p className="date">{new Date(letter.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
                <div className="letter-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => handleLetterClick(letter.link_id)}
                  >
                    View
                  </button>
                  <button 
                    className="action-btn copy-btn"
                    onClick={() => copyToClipboard(letter.link_id)}
                  >
                    Copy Link
                  </button>
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
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          min-height: calc(100vh - 80px);
        }

        .signin-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 2rem 0;
        }

        .user-avatar {
          margin-bottom: 1.5rem;
        }

        .avatar-image {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          background: white;
          border: 2px solid #ccc;
        }

        .default-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .google-signin-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #4285f4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }

        .google-signin-btn:hover {
          background: #3367d6;
          transform: translateY(-1px);
        }

        .google-icon {
          flex-shrink: 0;
        }

        .signin-description {
          text-align: center;
          color: #666;
          max-width: 400px;
          line-height: 1.5;
          margin: 0;
          white-space: nowrap;
        }

        .history-header {
          margin-bottom: 1rem;
        }

        .history-header h1 {
          font-size: 2rem;
          margin: 0;
          color: #333;
          font-weight: 600;
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

        .letters-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .letter-item {
          display: flex;
          align-items: center;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .letter-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .letter-content {
          display: flex;
          align-items: center;
          flex: 1;
          cursor: pointer;
        }

        .album-cover {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 1rem;
        }

        .letter-details h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .song-info {
          margin: 0 0 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .date {
          margin: 0;
          color: #999;
          font-size: 0.8rem;
        }

        .letter-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn {
          background: #f8f9fa;
          color: #333;
        }

        .view-btn:hover {
          background: #e9ecef;
        }

        .copy-btn {
          background: #333;
          color: white;
        }

        .copy-btn:hover {
          background: #555;
        }

        @media (max-width: 768px) {
          .history-container {
            padding: 1rem;
          }

          .user-avatar {
            margin-bottom: 1.5rem;
          }

          .avatar-image {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            background: white;
            border: 2px solid #ccc;
          }

          .default-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .default-avatar svg {
            width: 48px;
            height: 48px;
          }

          .signin-description {
            white-space: normal;
          }

          .letter-item {
            flex-direction: column;
            align-items: stretch;
          }

          .letter-content {
            margin-bottom: 1rem;
          }

          .letter-actions {
            justify-content: stretch;
          }

          .action-btn {
            flex: 1;
          }
        }
      `}</style>
    </main>
  )
}