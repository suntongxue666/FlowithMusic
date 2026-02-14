'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import SongSelector from '@/components/SongSelector'
import EmojiSelector from '@/components/EmojiSelector'
import SpotifyEmbedPlayer from '@/components/SpotifyEmbedPlayer'
import Toast from '@/components/Toast'
import { SpotifyTrack } from '@/lib/spotify'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
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
            setSelectedEmojis(data.emojis || [])

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
          track: selectedTrack,
          emojis: selectedEmojis
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

    // 检查是否已登录
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
        animation_config: {
          emojis: selectedEmojis
        }
      })

      // 添加15秒超时保护
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Letter creation timeout after 15 seconds')), 15000)
      )

      const newLetter = await Promise.race([letterPromise, timeoutPromise]) as any

      if (!newLetter || !newLetter.link_id) {
        throw new Error('Letter creation failed: Empty result from server')
      }

      console.log('Letter created successfully:', newLetter)
      setCreatedLetter(newLetter)

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

      const exists = existingLetters.some((letter: any) => letter.link_id === newLetter.link_id)
      if (!exists) {
        existingLetters.unshift(newLetter)
        localStorage.setItem('letters', JSON.stringify(existingLetters))
        console.log('✅ Letter added to localStorage and sanitized')
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
        router.push('/history')
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

          <div className="form-section">
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  👑 Flowing Emoji <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
                </div>
                <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">💰 $1.99/Letter</span>
              </label>
            </div>
            <EmojiSelector
              selectedEmojis={selectedEmojis}
              onSelect={setSelectedEmojis}
              maxSelection={3}
            />
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
                {selectedEmojis.length > 0 && (
                  <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg mb-4 text-left border border-yellow-100">
                    <span className="font-bold">✨ Flowing Emoji</span> requires an account to save your effects customization.
                  </div>
                )}
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

              {/* Only show Guest option if NO emojis are selected */}
              {selectedEmojis.length === 0 && (
                <>
                  <div className="divider">
                    <span>OR</span>
                  </div>

                  <button className="guest-login-btn" onClick={handleGuestContinue}>
                    Continue as Guest
                    <span className="guest-note">(Saved on this device only)</span>
                  </button>
                </>
              )}
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