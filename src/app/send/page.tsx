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
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Letter creation timed out after 30 seconds')), 30000)
      )

      // 确保用户服务可用（如果失败则继续，不阻止发送）
      try {
        await userService.initializeUser()
      } catch (userError) {
        console.warn('User service initialization failed, but continuing with letter creation:', userError)
      }
      
      console.log('Creating letter with track:', selectedTrack.name)

      // Save to Supabase using letterService with timeout
      const newLetter = await Promise.race([
        letterService.createLetter({
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
        }),
        timeoutPromise
      ]) as any

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