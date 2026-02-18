'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import SongSelector from '@/components/SongSelector'
import SpotifyEmbedPlayer from '@/components/SpotifyEmbedPlayer'
import Toast from '@/components/Toast'
import { SpotifyTrack } from '@/lib/spotify'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

// Flowing Emoji 适合写信场景的表情（亲情、爱情、友情、温馨等情感表达）
const FLOWING_EMOJIS = [
  // 爱情类
  '❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💞', '💟', '🩷',
  // 温馨类
  '🥰', '😊', '🥺', '😍', '🤗', '🫂', '😌', '🥹', '😊', '🙂',
  // 友情类
  '🤝', '✨', '🌟', '⭐', '💫', '🌈', '🌸', '🌹', '🦋', '💌'
]

// 完整的 Emoji 列表（用于"All Emojis"选项）
const ALL_EMOJIS = [
  // 爱情类
  '❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💞', '💟', '🩷', '❣️', '💔', '💕', '💖', '💗',
  // 温馨类
  '🥰', '😊', '🥺', '😍', '🤗', '🫂', '😌', '🥹', '🙂', '😘', '😙', '😚', '🥲', '🤩', '😇',
  // 友情类
  '🤝', '✨', '🌟', '⭐', '💫', '🌈', '🌸', '🌹', '🦋', '💌', '🎀', '🎁', '🎈', '🎉', '🎊',
  // 动物类
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
  '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  // 自然类
  '🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌴', '🌵', '🌾', '🍀', '🍁', '🍂', '🍃', '🌊', '🌙',
  // 食物类
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍑', '🥝', '🍅', '🥑', '🍆', '🥕', '🌽',
  // 其他
  '🎵', '🎶', '🎹', '🎸', '🎺', '🎷', '🎻', '🥁', '💃', '🕺', '🎭', '🎨', '🎬', '📷', '🎥'
]

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // 新增：登录弹窗状态
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Flowing Emoji 状态
  const [flowingEmojiEnabled, setFlowingEmojiEnabled] = useState(true) // 默认打开
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['❤️']) // 默认选择一个
  const [showAllEmojis, setShowAllEmojis] = useState(false) // 是否显示所有 Emoji

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

  // Flowing Emoji 切换
  const toggleFlowingEmoji = () => {
    setFlowingEmojiEnabled(!flowingEmojiEnabled)
    if (!flowingEmojiEnabled) {
      // 重新打开时恢复默认选择
      setSelectedEmojis(['❤️'])
    }
  }

  // Flowing Emoji 选择（支持选择相同表情）
  const handleEmojiSelect = (emoji: string) => {
    if (selectedEmojis.includes(emoji)) {
      // 已选中则取消
      setSelectedEmojis(selectedEmojis.filter(e => e !== emoji))
    } else if (selectedEmojis.length < 3) {
      // 未选中且未满3个则添加
      setSelectedEmojis([...selectedEmojis, emoji])
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
        // 静默失败，不阻断用户
      }

      // 检查是否是登录后恢复发送
      const isResume = searchParams.get('resume') === '1'

      // 检查是否有预保存的未发送信件
      if (typeof window !== 'undefined') {
        const pendingLetter = localStorage.getItem('pending_letter')
        if (pendingLetter) {
          try {
            const data = JSON.parse(pendingLetter)
            setRecipient(data.recipient || '')
            setMessage(data.message || '')
            setSelectedTrack(data.track || null)
            // setSelectedEmojis(data.emojis || []) // Temporarily disabled

            console.log('Restored pending letter data')

            // 如果是登录后恢复，自动提交
            if (isResume && userService.isAuthenticated()) {
              console.log('🔄 Auto-submitting after login...')
              // 延迟一点让状态更新
              setTimeout(() => {
                localStorage.removeItem('pending_letter')
              }, 100)
            } else {
              // 清除pending状态，避免反复恢复
              localStorage.removeItem('pending_letter')
            }
          } catch (e) {
            console.error('Failed to parse pending letter:', e)
          }
        }
      }
    }

    initUser()
  }, [searchParams])

  // 登录后自动提交（表单数据恢复后）
  useEffect(() => {
    const isResume = searchParams.get('resume') === '1'
    if (isResume && userService.isAuthenticated() && recipient && message && selectedTrack && !isSubmitting) {
      console.log('🚀 Auto-submitting letter after login resume...')
      submitLetter(false)
    }
  }, [recipient, message, selectedTrack, searchParams])

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
  }

  // 处理Google登录
  const handleGoogleLogin = async () => {
    try {
      if (typeof window !== 'undefined') {
        // 保存当前表单状态到localStorage，以便登录后恢复
        localStorage.setItem('pending_letter', JSON.stringify({
          recipient,
          message,
          track: selectedTrack
        }))
      }
      await userService.signInWithGoogle()
    } catch (error) {
      console.error('Login failed:', error)
      setErrorMessage('Login failed. Please try again.')
      setShowErrorModal(true)
      setShowLoginModal(false)
    }
  }

  // 处理游客继续
  const handleGuestContinue = () => {
    setShowLoginModal(false)
    submitLetter(true) // 标记为游客模式
  }

  const handleSubmit = async () => {
    if (!selectedTrack || !recipient.trim() || !message.trim()) return

    const isAuthenticated = userService.isAuthenticated()

    if (!isAuthenticated) {
      // 未登录则显示登录弹窗
      setShowLoginModal(true)
      return
    }

    // 已登录直接提交
    submitLetter(false)
  }

  const submitLetter = async (isGuest: boolean) => {
    setIsSubmitting(true)

    try {
      console.log(`Creating letter (Guest: ${isGuest}) with track:`, selectedTrack?.name)

      // 添加浏览器信息日志
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      })

      // 确保用户服务可用（增加 5 秒超时保护，防止卡死）
      try {
        const initPromise = userService.initializeUser()
        const initTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User init timeout')), 5000)
        )
        await Promise.race([initPromise, initTimeout])
      } catch (userError) {
        console.warn('User service initialization timed out or failed, but continuing:', userError)
      }

      // 增加重试机制：最多重试2次
      let lastError = null;
      let newLetter = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries && !newLetter; attempt++) {
        try {
          console.log(`📧 Letter creation attempt ${attempt}/${maxRetries}...`);

          const letterPromise = letterService.createLetter({
            to: recipient.trim(),
            message: message.trim(),
            song: {
              id: selectedTrack!.id,
              title: selectedTrack!.name,
              artist: selectedTrack!.artists[0]?.name || 'Unknown Artist',
              albumCover: selectedTrack!.album.images[0]?.url || '',
              previewUrl: selectedTrack!.preview_url || undefined,
              spotifyUrl: selectedTrack!.external_urls.spotify,
              duration_ms: selectedTrack!.duration_ms
            },
            animation_config: flowingEmojiEnabled && selectedEmojis.length > 0 ? {
              emojis: selectedEmojis
            } : undefined
          });

          // 增加超时时间到 30秒
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Letter creation timeout after 30 seconds (attempt ${attempt}/${maxRetries})`)), 30000)
          );

          newLetter = await Promise.race([letterPromise, timeoutPromise]) as any;

          if (!newLetter || !newLetter.link_id) {
            throw new Error(`Letter creation failed: Empty result from server (attempt ${attempt}/${maxRetries})`);
          }

          console.log(`✅ Letter created successfully on attempt ${attempt}/${maxRetries}:`, newLetter);

        } catch (error: any) {
          lastError = error;
          console.error(`❌ Letter creation failed on attempt ${attempt}/${maxRetries}:`, error.message);

          // 如果不是最后一次尝试，等待2秒后重试
          if (attempt < maxRetries) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // 所有尝试都失败
      if (!newLetter) {
        throw new Error(`Failed to send letter after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
      }

      if (!newLetter || !newLetter.link_id) {
        throw new Error('Letter creation failed: Empty result from server')
      }

      console.log('Letter created successfully:', newLetter)
      setCreatedLetter(newLetter)

      // 确保 animation_config 被保存（如果数据库没有返回，手动添加）
      const letterWithAnimation = {
        ...newLetter,
        animation_config: flowingEmojiEnabled && selectedEmojis.length > 0 
          ? { emojis: selectedEmojis } 
          : newLetter.animation_config
      }

      // 立即将新Letter添加到localStorage中 (增加过滤，防止写入 null)
      const rawLetters = localStorage.getItem('letters')
      let existingLetters = []
      try {
        existingLetters = JSON.parse(rawLetters || '[]')
        if (!Array.isArray(existingLetters)) existingLetters = []
      } catch (e) {
        existingLetters = []
      }

      // 过滤掉可能存在的 null 或无效数据
      existingLetters = existingLetters.filter((l: any) => l && l.link_id)

      const exists = existingLetters.some((letter: any) => letter.link_id === letterWithAnimation.link_id)
      if (!exists) {
        existingLetters.unshift(letterWithAnimation)
        localStorage.setItem('letters', JSON.stringify(existingLetters))
        console.log('✅ Letter added to localStorage with animation_config:', letterWithAnimation.animation_config)
      }

      // 清理相关缓存
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('cache_')) localStorage.removeItem(key)
        })
        // 强制清除 History 页面缓存
        localStorage.removeItem('history_letters_cache')
        localStorage.removeItem('history_letters_cache_time')
      }

      // Show toast
      setShowToast(true)

      // 清除暂存的表单数据
      localStorage.removeItem('pending_letter')

      setTimeout(() => {
        router.push('/history?refresh=1')
      }, 1500)

    } catch (error: any) {
      console.error('Failed to submit:', error)
      // 显示具体错误信息，不再自动跳转
      setErrorMessage(`Failed to send letter: ${error.message || 'Unknown error'}`)
      setShowErrorModal(true)

      // 只有在明确是超时的情况下才尝试跳转（可选）
      /*
      if (error.message && error.message.includes('timeout')) {
         console.log('⏰ Timeout detected, redirecting anyway...')
         setTimeout(() => router.push('/history'), 2000)
      }
      */

      return
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
            <label htmlFor="recipient">To</label>
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

          {/* 👑 Flowing Emoji */}
          <div className="form-section">
            <div className="flowing-emoji-header">
              <div className="flowing-emoji-title" onClick={toggleFlowingEmoji}>
                <span className="emoji-icon">✨</span>
                <span className="title-text">Flowing Emoji</span>
                <span className="optional-badge">Optional</span>
              </div>
              <div className="flowing-emoji-toggle" onClick={toggleFlowingEmoji}>
                <div className={`toggle-track ${flowingEmojiEnabled ? 'enabled' : ''}`}>
                  <div className={`toggle-thumb ${flowingEmojiEnabled ? 'enabled' : ''}`}></div>
                </div>
              </div>
            </div>
            
            {flowingEmojiEnabled && (
            
                          <div className="flowing-emoji-selector">
            
                            {/* 选中的表情显示在上方 */}
            
                            {selectedEmojis.length > 0 && (
            
                              <div className="selected-preview">
            
                                {selectedEmojis.map((emoji, index) => (
            
                                  <span key={index} className="preview-emoji" onClick={() => handleEmojiSelect(emoji)} title="点击取消">{emoji}</span>
            
                                ))}
            
                                <span className="preview-hint">Tap to Cancel</span>
            
                              </div>
            
                            )}
            
                            <div className="emoji-hint">Select up to 3 emojis ({selectedEmojis.length}/3 selected)</div>
            
            
            
                            {/* 切换按钮 */}
            
                            <div className="emoji-toggle-container">
            
                              <button
            
                                className={`emoji-toggle-btn ${!showAllEmojis ? 'active' : ''}`}
            
                                onClick={() => setShowAllEmojis(false)}
            
                              >
            
                                Popular
            
                              </button>
            
                              <button
            
                                className={`emoji-toggle-btn ${showAllEmojis ? 'active' : ''}`}
            
                                onClick={() => setShowAllEmojis(true)}
            
                              >
            
                                All Emojis
            
                              </button>
            
                            </div>
            
            
            
                            <div className="emoji-options">
            
                              {(showAllEmojis ? ALL_EMOJIS : FLOWING_EMOJIS).map(emoji => (
            
                                <button
            
                                  key={emoji}
            
                                  className="emoji-option"
            
                                  onClick={() => handleEmojiSelect(emoji)}
            
                                  disabled={selectedEmojis.length >= 3 && !selectedEmojis.includes(emoji)}
            
                                >
            
                                  <span className="emoji-char">{emoji}</span>
            
                                </button>
            
                              ))}
            
                            </div>
            
                          </div>
            
                        )}
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
            {isSubmitting ? 'Sending...' : 'Send'}
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

      {/* Login Modal */}
      {
        showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Save Your Memory 💌</h3>
                <p>Log in to keep your letters safe forever</p>
                {/* 
                {selectedEmojis.length > 0 && (
                  <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg mb-4 text-left border border-yellow-100">
                    <span className="font-bold">✨ Flowing Emoji</span> requires an account to save your effects customization.
                  </div>
                )}
                 */}
              </div>

              <button className="google-login-btn" onClick={handleGoogleLogin}>
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                  </g>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Remove Guest restriction for testing Emoji */}
              <div className="divider">
                <span>OR</span>
              </div>

              <button className="guest-login-btn" onClick={handleGuestContinue}>
                Continue as Guest
                <span className="guest-note">(Saved on this device only)</span>
              </button>
            </div>
          </div>
        )
      }

      {/* Error Modal */}
      {
        showErrorModal && (
          <div className="modal-overlay" onClick={handleErrorModalClose}>
            <div className="modal-content error-modal" onClick={(e) => e.stopPropagation()}>
              <div className="error-icon">⚠️</div>
              <h3>Error</h3>
              <p>{errorMessage}</p>
              <button
                className="modal-btn"
                onClick={handleErrorModalClose}
              >
                OK
              </button>
            </div>
          </div>
        )
      }

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          animation: slideUp 0.3s ease-out;
        }

        .login-modal h3 {
          margin-bottom: 0.5rem;
          font-family: var(--font-outfit);
        }

        .login-modal p {
          color: #666;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .google-login-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--font-inter);
          font-weight: 500;
          color: #333;
          transition: all 0.2s;
        }

        .google-login-btn:hover {
          background: #f8f9fa;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .divider {
          margin: 1.5rem 0;
          display: flex;
          align-items: center;
          color: #888;
          font-size: 0.8rem;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #eee;
        }

        .divider span {
          padding: 0 10px;
        }

        .guest-login-btn {
          width: 100%;
          padding: 12px;
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          color: #555;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: background 0.2s;
        }

        .guest-login-btn:hover {
          background: #eee;
        }

        .guest-note {
          font-size: 0.75rem;
          color: #999;
          font-weight: normal;
        }
        
        .error-modal .error-icon {
          font-size: 48px;
          margin-bottom: 1rem;
        }
        
        .modal-btn {
          margin-top: 1.5rem;
          padding: 10px 24px;
          background: #333;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Flowing Emoji Styles */
        .flowing-emoji-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 12px;
        }

        .flowing-emoji-title {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .emoji-icon {
          font-size: 18px;
        }

        .title-text {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }

        .optional-badge {
          font-size: 11px;
          font-weight: normal;
          color: #888;
          background: #f5f5f5;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .flowing-emoji-toggle {
          cursor: pointer;
        }

        .toggle-track {
          width: 44px;
          height: 24px;
          background: #e0e0e0;
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-track.enabled {
          background: #22c55e;
        }

        .toggle-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .toggle-thumb.enabled {
          transform: translateX(20px);
        }

        .flowing-emoji-selector {
          padding: 12px;
          background: #fafafa;
          border-radius: 12px;
          border: 1px solid #f0f0f0;
        }

        .selected-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .preview-emoji {
          font-size: 28px;
          cursor: pointer;
          animation: popIn 0.3s ease-out;
        }

        .preview-emoji:hover {
          opacity: 0.7;
        }

        .preview-hint {
          font-size: 11px;
          color: #999;
          margin-left: 8px;
        }

        .emoji-toggle-container {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .emoji-toggle-btn {
          flex: 1;
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .emoji-toggle-btn:hover {
          background: #f5f5f5;
        }

        .emoji-toggle-btn.active {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }
          color: #aaa;
        }

        .emoji-hint {
          font-size: 12px;
          color: #888;
          margin-bottom: 10px;
        }

        .emoji-options {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 6px;
        }

        .emoji-option {
          width: 100%;
          aspect-ratio: 1;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          padding: 4px;
        }

        .emoji-option:hover:not(:disabled) {
          background: #f5f5f5;
          transform: scale(1.1);
        }

        .emoji-option:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .emoji-char {
          font-size: 18px;
        }

        /* H5 移动端适配 */
        @media (max-width: 768px) {
          .emoji-options {
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
          }

          .emoji-option {
            padding: 2px;
          }

          .emoji-char {
            font-size: 16px;
          }
        }
        }

        .preview-emoji {
          font-size: 24px;
          animation: popIn 0.3s ease-out;
        }

        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main >
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <main>
        <Header currentPage="send" />
        <div className="send-container">
          <div className="send-form">
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-black animate-spin"></div>
            </div>
          </div>
        </div>
      </main>
    }>
      <SendContent />
    </Suspense>
  )
}