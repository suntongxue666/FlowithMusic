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
import { socialMediaService, SocialMediaData } from '@/lib/socialMediaService'

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
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

  // 初始化用户和加载社交媒体数据
  useEffect(() => {
    const initUser = async () => {
      try {
        const anonymousId = await userService.initializeUser()
        console.log('User initialized with ID:', anonymousId)
        setUserInitialized(true)
        
        // 检查用户是否已登录
        const user = await userService.getCurrentUser()
        if (user) {
          setIsLoggedIn(true)
          setCurrentUserId(user.id)
          
          // 加载用户的社交媒体数据
          try {
            const socialMediaData = await socialMediaService.getUserSocialMediaData(user.id)
            setSocialMedia(socialMediaData)
          } catch (error) {
            console.error('Failed to load social media data:', error)
          }
        }
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

  // 处理社交媒体输入变化
  const handleSocialMediaChange = (platform: keyof SocialMediaData, value: string) => {
    setSocialMedia(prev => ({
      ...prev,
      [platform]: value
    }))
  }

  // 保存社交媒体数据
  const saveSocialMediaData = async () => {
    if (!isLoggedIn || !currentUserId) return
    
    try {
      await socialMediaService.saveSocialMediaData(currentUserId, socialMedia)
      console.log('Social media data saved successfully')
    } catch (error) {
      console.error('Failed to save social media data:', error)
    }
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

      // 为PC浏览器添加额外的超时保护（手机Safari不需要，因为它工作正常）
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      let letterPromise = letterService.createLetter({
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
      
      // 只对PC浏览器添加超时保护
      if (!isMobile) {
        console.log('🖥️ PC browser detected, adding timeout protection')
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PC browser timeout: Letter creation took too long')), 45000)
        )
        letterPromise = Promise.race([letterPromise, timeoutPromise]) as Promise<any>
      } else {
        console.log('📱 Mobile browser detected, using normal flow')
      }
      
      const newLetter = await letterPromise

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

      // 保存社交媒体数据（如果用户已登录）
      if (isLoggedIn && currentUserId) {
        try {
          await saveSocialMediaData()
        } catch (error) {
          console.error('Failed to save social media data, but letter was created successfully:', error)
        }
      }

      // Show toast
      setShowToast(true)

      // 等待一下确保数据已经保存，然后跳转
      setTimeout(() => {
        router.push('/history')
      }, 1500)

    } catch (error) {
      console.error('Failed to submit:', error)
      
      // 特别处理PC浏览器的超时错误
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (!isMobile && error instanceof Error && error.message.includes('PC browser timeout')) {
        console.warn('🖥️ PC browser timeout detected, showing specific error message')
        setErrorMessage('⏰ PC浏览器提交超时了。请尝试刷新页面或切换到手机浏览器。手机Safari表现最佳！')
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create letter. Please try again.'
        setErrorMessage(`⚠️ ${errorMsg}`)
      }
      
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

          {/* 社交媒体账号输入 - 仅登录用户显示 */}
          {isLoggedIn && (
            <div className="form-section">
              <label>Social Media (Optional)</label>
              <div className="social-media-inputs">
                <div className="social-input-group">
                  <label htmlFor="instagram">Instagram</label>
                  <input
                    type="text"
                    id="instagram"
                    placeholder="@username"
                    className="form-input"
                    value={socialMedia.instagram || ''}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  />
                </div>
                
                <div className="social-input-group">
                  <label htmlFor="twitter">X (Twitter)</label>
                  <input
                    type="text"
                    id="twitter"
                    placeholder="@username"
                    className="form-input"
                    value={socialMedia.twitter || ''}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  />
                </div>
                
                <div className="social-input-group">
                  <label htmlFor="tiktok">TikTok</label>
                  <input
                    type="text"
                    id="tiktok"
                    placeholder="@username"
                    className="form-input"
                    value={socialMedia.tiktok || ''}
                    onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                  />
                </div>
                
                <div className="social-input-group">
                  <label htmlFor="youtube">YouTube</label>
                  <input
                    type="text"
                    id="youtube"
                    placeholder="@username"
                    className="form-input"
                    value={socialMedia.youtube || ''}
                    onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                  />
                </div>
                
                <div className="social-input-group">
                  <label htmlFor="spotify">Spotify</label>
                  <input
                    type="text"
                    id="spotify"
                    placeholder="username"
                    className="form-input"
                    value={socialMedia.spotify || ''}
                    onChange={(e) => handleSocialMediaChange('spotify', e.target.value)}
                  />
                </div>
              </div>
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