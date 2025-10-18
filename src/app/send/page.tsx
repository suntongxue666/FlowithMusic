'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import SongSelector from '@/components/SongSelector'
import SpotifyEmbedPlayer from '@/components/SpotifyEmbedPlayer'
import Toast from '@/components/Toast'
import { SpotifyTrack } from '@/lib/spotify'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'

export default function SendPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdLetter, setCreatedLetter] = useState<any>(null)
  const [userInitialized, setUserInitialized] = useState(false)
  const [showRecipientHint, setShowRecipientHint] = useState(false)
  const [showMessageHint, setShowMessageHint] = useState(false)

  // 检测中文字符
  const hasChinese = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text)
  }

  // 显示中文提示
  const showChineseHint = (field: 'recipient' | 'message') => {
    if (field === 'recipient') {
      setShowRecipientHint(true)
      setTimeout(() => setShowRecipientHint(false), 5000)
    } else {
      setShowMessageHint(true)
      setTimeout(() => setShowMessageHint(false), 5000)
    }
  }

  // 初始化用户
  useEffect(() => {
    const initUser = async () => {
      try {
        const anonymousId = await userService.initializeUser()
        console.log('User initialized with ID:', anonymousId)
        setUserInitialized(true)
      } catch (error) {
        console.error('Failed to initialize user:', error)
        setErrorMessage('Failed to initialize user session. Please refresh the page.')
        setShowErrorModal(true)
      }
    }
    
    initUser()
  }, [])

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
  }

  const handleSubmit = async () => {
    if (!selectedTrack || !recipient.trim() || !message.trim()) return

    setIsSubmitting(true)
    
    try {
      // 添加浏览器信息日志
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      })
      
      // 确保用户服务可用（如果失败则继续，不阻止发送）
      try {
        await userService.initializeUser()
      } catch (userError) {
        console.warn('User service initialization failed, but continuing with letter creation:', userError)
      }
      
      console.log('Creating letter with track:', selectedTrack.name)

      // 简化的letter创建逻辑，添加更短的超时保护
      console.log('📝 开始创建letter...')
      
      const letterPromise = letterService.createLetter({
        to: recipient.trim(),
        message: message.trim(),
        song: {
          id: selectedTrack.id,
          title: selectedTrack.name,
          artist: selectedTrack.artists[0]?.name || 'Unknown Artist',
          albumCover: selectedTrack.album.images[0]?.url || '',
          previewUrl: selectedTrack.preview_url || undefined,
          spotifyUrl: selectedTrack.external_urls.spotify
        }
      })
      
      // 添加15秒超时保护，避免卡住
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Letter creation timeout after 15 seconds')), 15000)
      )
      
      const newLetter = await Promise.race([letterPromise, timeoutPromise]) as any

      console.log('Letter created successfully:', newLetter)
      setCreatedLetter(newLetter)

      // 立即将新Letter添加到localStorage中，确保History页面能看到
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      // 检查是否已存在，避免重复
      const exists = existingLetters.some((letter: any) => letter.link_id === newLetter.link_id)
      if (!exists) {
        existingLetters.unshift(newLetter) // 添加到开头
        localStorage.setItem('letters', JSON.stringify(existingLetters))
        console.log('✅ Letter added to localStorage for immediate visibility')
      }

      // 清理相关缓存，确保数据更新
      if (typeof window !== 'undefined') {
        // 清理所有可能相关的缓存
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key)
          }
        })
        console.log('✅ Cleared all caches for fresh data loading')
      }

      // Show toast
      setShowToast(true)

      // 等待一下确保数据已经保存，然后跳转
      setTimeout(() => {
        router.push('/history')
      }, 1500)

    } catch (error) {
      console.error('Failed to submit:', error)
      
      // 如果是超时错误，尝试简化的本地保存
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⏰ 检测到超时，尝试简化的本地保存...')
        
        try {
          // 创建简化的letter对象
          const simpleLetter = {
            id: `local-${Date.now()}`,
            link_id: `local-${Date.now()}`,
            user_id: userService.getCurrentUser()?.id || null,
            anonymous_id: userService.getCurrentUser() ? null : userService.getAnonymousId(),
            recipient_name: recipient.trim(),
            message: message.trim(),
            song_id: selectedTrack.id,
            song_title: selectedTrack.name,
            song_artist: selectedTrack.artists[0]?.name || 'Unknown Artist',
            song_album_cover: selectedTrack.album.images[0]?.url || '',
            song_preview_url: selectedTrack.preview_url || undefined,
            song_spotify_url: selectedTrack.external_urls.spotify,
            view_count: 0,
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // 保存到localStorage
          const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          existingLetters.unshift(simpleLetter)
          localStorage.setItem('letters', JSON.stringify(existingLetters))
          
          console.log('✅ 简化保存成功，letter已保存到本地')
          setCreatedLetter(simpleLetter)
          setShowToast(true)
          
          setTimeout(() => {
            router.push('/history')
          }, 1500)
          
          return // 成功处理，不显示错误
          
        } catch (localError) {
          console.error('❌ 简化保存也失败:', localError)
        }
      }
      
      // 显示错误信息
      const errorMsg = error instanceof Error ? error.message : 'Failed to create letter. Please try again.'
      setErrorMessage(`⚠️ ${errorMsg}`)
      setShowErrorModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const handleErrorModalClose = () => {
    setShowErrorModal(false)
    setErrorMessage('')
  }

  // Check if all required fields are filled (removed userInitialized dependency)
  const isFormComplete = recipient.trim() && message.trim() && selectedTrack

  return (
    <main>
      <Header currentPage="send" />
      <div className="send-container">
        <div className="send-form">
          <div className="form-section">
            <label htmlFor="recipient">Recipient</label>
            <div className="input-with-hint">
              <input 
                type="text" 
                id="recipient"
                placeholder="Enter recipient's name"
                className="form-input"
                value={recipient}
                onChange={(e) => {
                  const value = e.target.value
                  setRecipient(value)
                  if (hasChinese(value)) {
                    showChineseHint('recipient')
                  }
                }}
              />
              {showRecipientHint && (
                <div className="chinese-hint">抱歉暂不支持中文</div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label htmlFor="message">Message</label>
            <div className="input-with-hint">
              <textarea 
                id="message"
                placeholder="Write your message here"
                className="form-textarea"
                rows={6}
                value={message}
                onChange={(e) => {
                  const value = e.target.value
                  setMessage(value)
                  if (hasChinese(value)) {
                    showChineseHint('message')
                  }
                }}
              />
              {showMessageHint && (
                <div className="chinese-hint">抱歉暂不支持中文</div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label htmlFor="song">Song</label>
            <SongSelector 
              onSelect={handleTrackSelect}
              selectedTrack={selectedTrack}
            />
          </div>

          {selectedTrack && (
            <div className="form-section">
              <SpotifyEmbedPlayer track={selectedTrack} />
            </div>
          )}

          <button 
            className={`submit-btn ${isFormComplete ? 'complete' : ''}`}
            disabled={!isFormComplete || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Sending...' : 'Submit'}
          </button>
        </div>
        
        <div className="spotify-prompt desktop-only">
          <img 
            src="https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png" 
            alt="Spotify" 
            width={16} 
            height={16}
          />
          <span>  Log in to Spotify in your browser to listen to the full song.</span>
        </div>
      </div>

      <Toast 
        message="Link with 💌 is ready!\nPaste it in a text, WhatsApp, or IG Story — or open it to share the image and @yourfriend 🎶"
        isVisible={showToast}
        onClose={handleToastClose}
        duration={2000}
      />

      {/* Error Modal */}
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={handleErrorModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-content">
              <div className="error-icon">⚠️</div>
              <h3>Error</h3>
              <p>{errorMessage}</p>
              <button 
                className="error-modal-btn"
                onClick={handleErrorModalClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}