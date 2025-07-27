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
        console.log('🔄 Loading user letters, context:', {
          isAuthenticated,
          userId: user?.id,
          anonymousId: user?.anonymous_id
        })

        // 1. 智能加载本地数据 - 更宽泛的匹配策略
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        if (localLetters.length > 0) {
          console.log('💾 Found local letters:', localLetters.length)
          
          let userLocalLetters: any[] = []
          
          if (user) {
            // 已登录用户：匹配user_id或anonymous_id
            userLocalLetters = localLetters.filter((letter: any) => 
              letter.user_id === user.id || letter.anonymous_id === user.anonymous_id
            )
          } else {
            // 匿名用户：智能匹配策略
            const currentAnonymousId = localStorage.getItem('anonymous_id')
            
            // 首先尝试精确匹配
            userLocalLetters = localLetters.filter((letter: any) => 
              letter.anonymous_id === currentAnonymousId
            )
            
            // 如果精确匹配没有结果，且当前用户没有Letters，则采用"继承"策略
            if (userLocalLetters.length === 0 && localLetters.length > 0) {
              console.log('🔍 No exact match found, using inheritance strategy')
              
              // 检测是否是同一个浏览器/设备的用户（基于时间连续性和设备特征）
              const shouldInheritLetters = checkShouldInheritLetters(localLetters, currentAnonymousId)
              
              if (shouldInheritLetters) {
                console.log('✅ Inheriting all letters to current user')
                
                // 将所有Letters更新为当前的Anonymous ID
                const updatedLetters = localLetters.map((letter: any) => ({
                  ...letter,
                  anonymous_id: currentAnonymousId
                }))
                
                // 保存更新后的Letters
                localStorage.setItem('letters', JSON.stringify(updatedLetters))
                userLocalLetters = updatedLetters
                
                console.log(`🔄 Updated ${updatedLetters.length} letters to current anonymous ID`)
              }
            }
          }
          
          if (userLocalLetters.length > 0) {
            const sortedLocalLetters = userLocalLetters.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            setLetters(sortedLocalLetters)
            setLoading(false) // 立即停止loading
            console.log(`✅ Loaded ${sortedLocalLetters.length} local letters`)
          }
        }

        // 2. 然后异步加载远程数据并合并
        console.log('🌐 Loading remote letters...')
        const remoteLetters = await letterService.getUserLetters(50, 0)
        console.log('📡 Loaded remote letters:', remoteLetters.length)

        // 3. 合并本地和远程数据，去重
        const allLettersMap = new Map()
        
        // 先添加远程数据（作为权威数据源）
        remoteLetters.forEach(letter => {
          allLettersMap.set(letter.link_id, letter)
        })
        
        // 再添加本地数据（如果远程没有的话，可能是刚创建的）
        const currentAnonymousId = localStorage.getItem('anonymous_id')
        const updatedLocalLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        
        updatedLocalLetters.forEach((letter: any) => {
          // 确保只添加属于当前用户的Letters
          const belongsToUser = user ? 
            (letter.user_id === user.id || letter.anonymous_id === user.anonymous_id) :
            (letter.anonymous_id === currentAnonymousId)
            
          if (belongsToUser && !allLettersMap.has(letter.link_id)) {
            allLettersMap.set(letter.link_id, letter)
          }
        })
        
        const mergedLetters = Array.from(allLettersMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        console.log('✅ Final merged letters:', mergedLetters.length)
        setLetters(mergedLetters)
      } catch (error) {
        console.error('❌ Failed to load letters:', error)
        // 如果远程加载失败，至少显示本地数据
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const currentAnonymousId = localStorage.getItem('anonymous_id')
        
        const userLocalLetters = localLetters.filter((letter: any) => {
          if (user) {
            return letter.user_id === user.id || letter.anonymous_id === user.anonymous_id
          } else {
            return letter.anonymous_id === currentAnonymousId
          }
        })
        
        if (userLocalLetters.length > 0) {
          const sortedLetters = userLocalLetters.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setLetters(sortedLetters)
        }
      } finally {
        setLoading(false)
      }
    }

    // 检查是否应该继承Letters的智能逻辑
    const checkShouldInheritLetters = (letters: any[], currentAnonymousId: string | null): boolean => {
      if (!currentAnonymousId || letters.length === 0) return false
      
      // 策略1: 如果所有Letters都来自同一个Anonymous ID，可能是同一用户
      const anonymousIds = Array.from(new Set(letters.map(l => l.anonymous_id).filter(Boolean)))
      if (anonymousIds.length === 1) {
        console.log('🔍 All letters from single anonymous ID, likely same user')
        return true
      }
      
      // 策略2: 检查时间连续性（最近24小时内有活动）
      const now = Date.now()
      const recentLetters = letters.filter(l => {
        const letterTime = new Date(l.created_at).getTime()
        const hoursSince = (now - letterTime) / (1000 * 60 * 60)
        return hoursSince < 24
      })
      
      if (recentLetters.length > 0) {
        console.log('🔍 Recent activity detected, likely same user')
        return true
      }
      
      // 策略3: 如果Letters数量较多，可能是长期用户
      if (letters.length >= 5) {
        console.log('🔍 Multiple letters detected, likely returning user')
        return true
      }
      
      return false
    }

    loadUserLetters()
  }, [isAuthenticated, user])

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleCopyLink = (letter: Letter) => {
    // 如果有shareable_link，直接使用
    if (letter.shareable_link) {
      console.log('✅ Using existing shareable_link:', letter.shareable_link)
      navigator.clipboard.writeText(letter.shareable_link)
      setShowToast(true)
      return
    }
    
    // 生成简洁的链接，不包含data参数
    const simpleLink = `${window.location.origin}/letter/${letter.link_id}`
    console.log('✅ Generated simple link:', simpleLink)
    navigator.clipboard.writeText(simpleLink)
    
    setShowToast(true)
  }

  const handleViewLetter = (letter: Letter) => {
    // 直接跳转到简洁的Letter页面，依赖数据库获取
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
            {!isAuthenticated && (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem'
              }}>
                <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                  Want to save your messages permanently?
                </p>
                <button className="google-sign-in-btn" onClick={handleSignIn} style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{marginRight: '6px'}}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
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
        {/* Google登录按钮 - 只在没有Letters且有内容的情况下显示，移动端友好 */}
        {!isAuthenticated && letters.length > 0 && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1.5rem', 
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa',
            fontSize: '0.9rem'
          }}>
            <button className="google-sign-in-btn" onClick={handleSignIn} style={{ 
              margin: '0 auto 0.75rem auto',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{marginRight: '6px'}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            <p style={{ 
              margin: '0', 
              color: '#666', 
              fontSize: '0.85rem'
            }}>
              💡 Log in to save your Letters, or they'll be lost forever.
            </p>
          </div>
        )}
        
        <h1 className="history-title" style={{ marginBottom: '2rem' }}>Your Message History</h1>
        
        <div className="message-list">
          {letters.map((letter) => (
            <div key={letter.id} className="message-item">
              <div 
                className="message-main clickable-area"
                onClick={() => handleViewLetter(letter)}
              >
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyLink(letter)
                  }}
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