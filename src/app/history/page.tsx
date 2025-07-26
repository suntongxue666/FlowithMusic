'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { letterService } from '@/lib/letterService'
import { useUser } from '@/contexts/UserContext'
import { Letter } from '@/lib/supabase'

export default function HistoryPage() {
  const router = useRouter()
  const { user, isAuthenticated, signInWithGoogle } = useUser()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const loadUserLetters = async () => {
      try {
        // 1. 立即加载本地数据，显示给用户
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        if (localLetters.length > 0) {
          console.log('Loading local letters first:', localLetters.length)
          setLetters(localLetters.reverse()) // 最新的在前面
          setLoading(false) // 立即停止loading
        }

        // 2. 然后异步加载远程数据并合并
        console.log('Loading remote letters, isAuthenticated:', isAuthenticated)
        const remoteLetters = await letterService.getUserLetters(50, 0)
        console.log('Loaded remote letters:', remoteLetters.length)

        // 3. 合并本地和远程数据，去重
        const allLettersMap = new Map()
        
        // 先添加远程数据（作为权威数据源）
        remoteLetters.forEach(letter => {
          allLettersMap.set(letter.link_id, letter)
        })
        
        // 再添加本地数据（如果远程没有的话，可能是刚创建的）
        localLetters.forEach((letter: any) => {
          if (!allLettersMap.has(letter.link_id)) {
            allLettersMap.set(letter.link_id, letter)
          }
        })
        
        const mergedLetters = Array.from(allLettersMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        setLetters(mergedLetters)
      } catch (error) {
        console.error('Failed to load letters:', error)
        // 如果远程加载失败，至少显示本地数据
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        if (localLetters.length > 0) {
          setLetters(localLetters.reverse())
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserLetters()
  }, [isAuthenticated])

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleCopyLink = (letter: Letter) => {
    // 使用可分享链接（如果有的话），否则使用普通链接
    const link = letter.shareable_link || `${window.location.origin}/letter/${letter.link_id}`
    console.log('Letter object:', letter)
    console.log('Shareable link:', letter.shareable_link)
    console.log('Final link to copy:', link)
    navigator.clipboard.writeText(link)
    setShowToast(true)
  }

  const handleViewLetter = (letter: Letter) => {
    router.push(`/letter/${letter.link_id}`)
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <main>
        <Header currentPage="history" />
        <div className="history-container">
          <div className="loading">Loading your letters...</div>
        </div>
      </main>
    )
  }

  // 如果没有letters，显示相应的提示
  if (letters.length === 0) {
    return (
      <main>
        <Header currentPage="history" />
        <div className="history-container">
          <div className="sign-in-section">
            <div className="user-avatar">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#ccc">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
              </svg>
            </div>
            
            {!isAuthenticated ? (
              <>
                <h3 style={{ marginBottom: '1rem', color: '#333' }}>No Messages Yet</h3>
                <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                  You haven't created any messages yet. Create your first musical message!
                </p>
                <button 
                  onClick={() => router.push('/send')}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#000', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    fontSize: '1rem'
                  }}
                >
                  Create Your First Message
                </button>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                  <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    Want to save your messages permanently?
                  </p>
                  <button className="google-sign-in-btn" onClick={handleSignIn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight: '8px'}}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </button>
                  <p className="sign-in-description">
                    Sign in to save your special Messages — the words and music that connect hearts.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '1rem', color: '#333' }}>No Messages Yet</h3>
                <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                  You haven't created any messages yet. Create your first musical message!
                </p>
                <button 
                  onClick={() => router.push('/send')}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#000', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Create Your First Message
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <Header currentPage="history" />
      <div className="history-container">
        {/* Google登录按钮 - 放在标题上方，居中显示 */}
        {!isAuthenticated && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem', 
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <button className="google-sign-in-btn" onClick={handleSignIn} style={{ 
              margin: '0 auto',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight: '8px'}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            <p style={{ 
              margin: '0.75rem 0 0 0', 
              color: '#666', 
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              Log in to save your Letters, or they'll be lost.
            </p>
          </div>
        )}
        
        <h1 className="history-title" style={{ marginBottom: '2rem' }}>Your Message History</h1>
        
        <div className="message-list">
          {letters.map((letter) => (
            <div key={letter.id} className="message-item">
              <div className="message-main">
                <img 
                  src={letter.song_album_cover || '/default-album.png'}
                  alt={letter.song_title}
                  className="message-album-cover"
                />
                <div className="message-details">
                  <div className="message-header">
                    <span className="message-to">To: {letter.recipient_name}</span>
                  </div>
                  <div className="message-song">
                    {letter.song_title} - {letter.song_artist}
                  </div>
                  <div className="message-date">
                    {formatDate(new Date(letter.created_at))}
                  </div>
                </div>
              </div>
              
              <div className="message-actions">
                <button 
                  className="view-btn"
                  onClick={() => handleViewLetter(letter)}
                >
                  View 💌
                </button>
                <button 
                  className="copy-link-btn"
                  onClick={() => handleCopyLink(letter)}
                >
                  Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Toast 
        message="Link copied to clipboard! 📋\nShare it with your friend via text, WhatsApp, or social media."
        isVisible={showToast}
        onClose={handleToastClose}
        duration={2000}
      />
    </main>
  )
}