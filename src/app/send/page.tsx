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
import { useUserState } from '@/hooks/useUserState'
import dynamic from 'next/dynamic'
import PremiumLimitModal from '@/components/PremiumLimitModal'

// 动态导入 emoji-picker-react 以避免 SSR 问题
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
)

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated: userAuth } = useUserState()
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<string>('Love')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdLetter, setCreatedLetter] = useState<any>(null)
  const [userInitialized, setUserInitialized] = useState(false)
  const [showRecipientHint, setShowRecipientHint] = useState(false)
  const [showMessageHint, setShowMessageHint] = useState(false)
  const [isDuplicateError, setIsDuplicateError] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  // 新增：登录弹窗状态
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Flowing Emoji 状态
  const [flowingEmojiEnabled, setFlowingEmojiEnabled] = useState(true) // 默认打开
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['❤️']) // 默认选择一个
  const [showEmojiPicker, setShowEmojiPicker] = useState(true) // 默认显示 Emoji 选择器

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
  const handleEmojiSelect = (emoji: any) => {
    const emojiChar = emoji.emoji || emoji.native || emoji
    if (!emojiChar) return

    if (selectedEmojis.includes(emojiChar)) {
      setSelectedEmojis(selectedEmojis.filter(e => e !== emojiChar))
    } else if (selectedEmojis.length < 3) {
      setSelectedEmojis([...selectedEmojis, emojiChar])
    }
    setShowEmojiPicker(false)
  }

  // 初始化用户
  useEffect(() => {
    const initUser = async () => {
      try {
        await userService.initializeUser()
        setUserInitialized(true)
      } catch (error) {
        console.error('Failed to initialize user:', error)
      }

      const isResume = searchParams.get('resume') === '1'
      if (typeof window !== 'undefined') {
        const pendingLetter = localStorage.getItem('pending_letter')
        if (pendingLetter) {
          try {
            const data = JSON.parse(pendingLetter)
            setRecipient(data.recipient || '')
            setMessage(data.message || '')
            setCategory(data.category || 'Love')
            setSelectedTrack(data.track || null)
            
            if (isResume && userService.isAuthenticated()) {
              setTimeout(() => {
                localStorage.removeItem('pending_letter')
              }, 100)
            } else {
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

  // 登录后自动提交
  useEffect(() => {
    const isResume = searchParams.get('resume') === '1'
    if (isResume && userService.isAuthenticated() && recipient && message && selectedTrack && !isSubmitting) {
      submitLetter(false)
    }
  }, [recipient, message, selectedTrack, category, searchParams])

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
  }

  const handleGoogleLogin = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pending_letter', JSON.stringify({
          recipient,
          message,
          category,
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

  const handleGuestContinue = () => {
    setShowLoginModal(false)
    submitLetter(true)
  }

  const handleSubmit = async () => {
    if (!selectedTrack || !recipient.trim() || !message.trim()) return

    // 确保用户已初始化 (获取匿名ID等)
    if (!userInitialized) {
      await userService.initializeUser()
      setUserInitialized(true)
    }

    // 每天限额检查 (非会员限 2 封)
    const isPremium = user?.is_premium || false;
    if (!isPremium) {
      const queryId = user?.id;
      const anonId = userService.getAnonymousId();
      console.log('📊 Checking limit for:', { queryId, anonId });
      const count = await letterService.getTodayCount(queryId || undefined, anonId || undefined);
      console.log('📊 Current today count:', count);
      
      if (count >= 2) {
        setShowPremiumModal(true);
        return;
      }
    }

    if (!userAuth) {
      setShowLoginModal(true)
      return
    }

    submitLetter(false)
  }

  const submitLetter = async (isGuest: boolean) => {
    // 每天限额检查 (非会员限 2 封)
    const isPremium = user?.is_premium || false;
    console.log('🛡️ Subscription Check:', { isPremium, userId: user?.id });
    
    if (!isPremium) {
      const queryId = user?.id;
      const anonId = userService.getAnonymousId();
      console.log('📊 Fetching count for:', { queryId, anonId });
      
      const count = await letterService.getTodayCount(queryId || undefined, anonId || undefined);
      console.log('📊 Today letters count:', count);
      
      if (count >= 2) {
        console.log('🚫 Limit reached! Showing Premium Modal.');
        setShowPremiumModal(true);
        setIsSubmitting(false);
        return;
      }
    }

    const lastSubmission = localStorage.getItem('last_letter_submission');
    const currentTime = Date.now();
    const currentMessage = message.trim();
    const currentRecipient = recipient.trim();

    if (lastSubmission) {
      try {
        const { content, to, time } = JSON.parse(lastSubmission);
        if (content === currentMessage && to === currentRecipient && (currentTime - time) < 300000) {
          setErrorMessage("A letter with the same content has already been published. Please check your History.");
          setIsDuplicateError(true);
          setShowErrorModal(true);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse last submission data', e);
      }
    }

    setIsSubmitting(true)

    try {
      const newLetter = await letterService.createLetter({
        to: recipient.trim(),
        message: message.trim(),
        category: category,
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

      if (!newLetter || !newLetter.link_id) {
        throw new Error('Letter creation failed')
      }

      setCreatedLetter(newLetter)

      const rawLetters = localStorage.getItem('letters')
      let existingLetters = JSON.parse(rawLetters || '[]')
      if (!Array.isArray(existingLetters)) existingLetters = []
      existingLetters.unshift(newLetter)
      localStorage.setItem('letters', JSON.stringify(existingLetters))

      localStorage.setItem('last_letter_submission', JSON.stringify({
        content: message.trim(),
        to: recipient.trim(),
        time: Date.now()
      }));

      setShowToast(true)
      localStorage.removeItem('pending_letter')

      setTimeout(() => {
        router.push('/history?refresh=1')
      }, 1500)

    } catch (error: any) {
      console.error('Failed to submit:', error)
      setErrorMessage(error.message || 'Failed to send letter')
      setShowErrorModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToastClose = () => setShowToast(false)
  const handleErrorModalClose = () => {
    setShowErrorModal(false)
    setErrorMessage('')
    setIsDuplicateError(false)
  }

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
                onChange={(e) => setRecipient(e.target.value)}
              />
              {showRecipientHint && <div className="chinese-hint">抱歉暂不支持中文</div>}
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
                onChange={(e) => setMessage(e.target.value)}
              />
              {showMessageHint && <div className="chinese-hint">抱歉暂不支持中文</div>}
            </div>
          </div>

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
                {selectedEmojis.length > 0 && (
                  <div className="selected-preview">
                    {selectedEmojis.map((emoji, index) => (
                      <span key={index} className="preview-emoji" onClick={() => handleEmojiSelect(emoji)}>{emoji}</span>
                    ))}
                    <span className="preview-hint">Tap to Cancel</span>
                  </div>
                )}
                <div className="emoji-hint">Select up to 3 emojis ({selectedEmojis.length}/3 selected)</div>
                <div className="emoji-mart-container">
                  <EmojiPicker onEmojiClick={handleEmojiSelect} width="100%" height={350} />
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="category">Category</label>
            <select id="category" className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Love">Love</option>
              <option value="Friendship">Friendship</option>
              <option value="Family">Family</option>
            </select>
          </div>

          <div className="form-section">
            <label htmlFor="song">Song</label>
            <SongSelector onSelect={handleTrackSelect} selectedTrack={selectedTrack} />
          </div>

          {selectedTrack && <SpotifyEmbedPlayer track={selectedTrack} />}

          <button
            className={`submit-btn ${isFormComplete ? 'complete' : ''}`}
            disabled={!isFormComplete || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <Toast message="Letter is ready!" isVisible={showToast} onClose={handleToastClose} />

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Save Your Memory 💌</h3>
            <button className="google-login-btn" onClick={handleGoogleLogin}>Continue with Google</button>
            <button className="guest-login-btn" onClick={handleGuestContinue}>Continue as Guest</button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="modal-overlay" onClick={handleErrorModalClose}>
          <div className="modal-content error-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{isDuplicateError ? 'Duplicate' : 'Error'}</h3>
            <p>{errorMessage}</p>
            <button onClick={handleErrorModalClose}>OK</button>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <PremiumLimitModal onClose={() => setShowPremiumModal(false)} type="daily_limit" />
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white; padding: 2rem; border-radius: 12px;
          width: 90%; max-width: 400px; text-align: center;
        }
        .flowing-emoji-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
        }
        .flowing-emoji-title { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .toggle-track {
          width: 44px; height: 24px; background: #e0e0e0; border-radius: 12px;
          position: relative; transition: background 0.2s;
        }
        .toggle-track.enabled { background: #22c55e; }
        .toggle-thumb {
          width: 20px; height: 20px; background: white; border-radius: 50%;
          position: absolute; top: 2px; left: 2px; transition: transform 0.2s;
        }
        .toggle-thumb.enabled { transform: translateX(20px); }
        .selected-preview { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .preview-emoji { font-size: 24px; cursor: pointer; }
      `}</style>
    </main>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SendContent />
    </Suspense>
  )
}