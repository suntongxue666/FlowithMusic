'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
  
  // 新增：收件人类型
  const [recipientType, setRecipientType] = useState<'direct' | 'random' | 'soulmate'>('direct')
  const [soulmateUsers, setSoulmateUsers] = useState<any[]>([])
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | null>(null)
  const [isLoadingSoulmates, setIsLoadingSoulmates] = useState(false)
  const [historicalArtists, setHistoricalArtists] = useState<string[]>([])
  const [currentArtistIndex, setCurrentArtistIndex] = useState(0)
  const historicalArtist = historicalArtists[currentArtistIndex] || null;

  // 新增：公开/私密状态
  const [isPublic, setIsPublic] = useState(true)

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
            if (data.isPublic !== undefined) setIsPublic(data.isPublic)
            
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

  // 新增：独立且可靠的历史记录获取逻辑
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userInitialized) return
      
      try {
        const { letterService } = await import('@/lib/letterService')
        const { userService } = await import('@/lib/userService')
        
        const userId = user?.id || userService.getCurrentUser()?.id
        const anonId = userService.getAnonymousId()
        
        console.log('⏳ [History] Fetching past letters for:', { userId, anonId })
        const letters = await letterService.getUserLetters(userId || undefined, anonId || undefined)
        
        if (letters && letters.length > 0) {
          // 提取所有唯一歌手
          const uniqueArtists = Array.from(new Set(letters.map((l: any) => l.song_artist).filter(Boolean))) as string[]
          console.log(`✅ [History] Found ${letters.length} letters with ${uniqueArtists.length} unique artists.`)
          if (uniqueArtists.length > 0) {
            setHistoricalArtists(uniqueArtists)
          }
        } else {
          console.log('ℹ️ [History] No previous letters found.')
        }
      } catch (e) {
        console.error('❌ [History] Failed to fetch historical letters:', e)
      }
    }
    fetchHistory()
  }, [userInitialized, user])

  // 切换历史歌手列表
  const handleRotateArtist = () => {
    if (historicalArtists.length <= 1) return
    const nextIndex = (currentArtistIndex + 1) % historicalArtists.length
    setCurrentArtistIndex(nextIndex)
    const nextArtist = historicalArtists[nextIndex]
    if (nextArtist) {
      fetchSoulmates(nextArtist)
    }
  }

  // 登录后自动提交
  useEffect(() => {
    const isResume = searchParams.get('resume') === '1'
    if (isResume && userService.isAuthenticated() && recipient && message && selectedTrack && !isSubmitting) {
      submitLetter(false)
    }
  }, [recipient, message, selectedTrack, category, searchParams])

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    // 优化：不再根据新选择的歌曲重新刷新同好列表，仅保留历史推荐逻辑
  }

  // 获取同好用户
  const fetchSoulmates = async (artist: string) => {
    if (!artist) return
    setIsLoadingSoulmates(true)
    try {
      const { userService } = await import('@/lib/userService')
      const userId = user?.id || userService.getCurrentUser()?.id
      const anonId = userService.getAnonymousId()
      
      // 确保排除当前登录用户和匿名ID
      const excludeParam = userId ? `&excludeUserId=${userId}` : (anonId ? `&excludeUserId=${anonId}` : '')
      const res = await fetch(`/api/artist-fans?artist=${encodeURIComponent(artist)}${excludeParam}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`🎵 [Soulmate] Found ${data.fans?.length || 0} fans for ${artist}`)
        setSoulmateUsers(data.fans || [])
      }
    } catch (e) {
      console.error('❌ [Soulmate] Fetch failed:', e)
    } finally {
      setIsLoadingSoulmates(false)
    }
  }

  // 获取随机用户并立即显示
  const fetchRandomUser = async () => {
    try {
      const res = await fetch('/api/random-user');
      if (res.ok) {
        const data = await res.json();
        if (data.userId) {
          setRecipient(data.displayName || 'A Random Soul');
          setSelectedTargetUserId(data.userId);
        }
      }
    } catch (e) {
      console.error('Failed to fetch random user:', e);
      setRecipient('A Random Soul');
    }
  }

  // 切换收件人类型
  useEffect(() => {
    if (recipientType === 'random') {
      // 随机模式：立即匹配并显示
      setRecipient('Matching...')
      fetchRandomUser()
    } else if (recipientType === 'soulmate') {
      // 优化：切换到同好模式时，如果不改变歌曲，不要轻易清空已经选好的收件人
      // 仅当目前没有收件人时，才尝试根据历史推荐
      if (!recipient && historicalArtist) {
        fetchSoulmates(historicalArtist)
      }
    } else if (recipientType === 'direct') {
      // 个人模式：清除名字
      setRecipient('')
      setSelectedTargetUserId(null)
    }
  }, [recipientType, historicalArtist]) // 关键：移除了对 selectedTrack 的监听，防止选歌时重置收件人

  const handleGoogleLogin = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pending_letter', JSON.stringify({
          recipient,
          message,
          category,
          track: selectedTrack,
          isPublic
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
    if (isSubmitting) return // Prevent double-click
    if (!selectedTrack || !recipient.trim() || !message.trim()) return

    setIsSubmitting(true) // Immediately disable button

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
        setIsSubmitting(false);
        return;
      }
    }

    // 实时检查登录状态
    const isActuallyAuthenticated = userService.isAuthenticated()
    if (!isActuallyAuthenticated) {
      setShowLoginModal(true)
      setIsSubmitting(false)
      return
    }

    submitLetter(false)
  }

  const submitLetter = async (isGuest: boolean) => {
    if (isSubmitting) return // Prevent double-click race condition
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
    const finalTargetUserId = selectedTargetUserId;

    try {
      const { userService } = await import('@/lib/userService')
      const currentAuthUser = userService.getCurrentUser()
      const currentAnonId = userService.getAnonymousId()

      const newLetter = await (letterService as any).createLetter(
        {
          to: recipient.trim(),
          message: message.trim(),
          category: category,
          recipient_type: recipientType,
          target_user_id: finalTargetUserId,
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
          } : undefined,
          is_public: isPublic
        },
        currentAuthUser, // 显式传递当前用户对象
        currentAnonId    // 显式传递匿名ID
      );

      if (!newLetter || !newLetter.link_id) {
        throw new Error('Letter creation failed')
      }

      // 如果有目标用户（随机或同好），发送站内通知
      if (finalTargetUserId) {
        console.log('📡 [Notification] Triggering notification for:', {
          targetUserId: finalTargetUserId,
          type: recipientType,
          linkId: newLetter.link_id
        });
        
        try {
          const notifyRes = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: finalTargetUserId,
              senderName: user?.display_name || 'Someone',
              recipientType: recipientType,
              artistName: selectedTrack?.artists[0]?.name || 'Unknown Artist',
              linkId: newLetter.link_id
            })
          });
          
          if (notifyRes.ok) {
            console.log('✅ [Notification] API call successful');
          } else {
            const errorData = await notifyRes.json();
            console.error('❌ [Notification] API call failed:', errorData);
          }
        } catch (e) {
          console.error('💥 [Notification] Network/Fatal error:', e);
        }
      }

      // Add user info if logged in so local storage and UI show it properly
      if (userAuth && user) {
        newLetter.user = {
          id: user.id,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          is_premium: user.is_premium
        } as any
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
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
              Who view No ads with <Link href="/premium" style={{ textDecoration: 'underline', color: '#000', fontWeight: 500 }}>👑 Premium</Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <label htmlFor="recipient" style={{ marginBottom: 0 }}>To</label>
              <select 
                className="recipient-type-select"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as any)}
              >
                <option value="direct">Personal</option>
                <option value="random">Random Soul</option>
                <option value="soulmate">Music Soulmate</option>
              </select>
            </div>
            
            <div className="input-with-hint">
              <input
                type="text"
                id="recipient"
                placeholder={
                  recipientType === 'random' 
                    ? "System will pick someone..." 
                    : recipientType === 'soulmate'
                    ? "Select an user Based on your past letters"
                    : "Enter recipient's name"
                }
                className={`form-input ${recipientType === 'random' ? 'disabled-input' : ''}`}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={recipientType === 'random'}
              />
              {showRecipientHint && <div className="chinese-hint">抱歉暂不支持中文</div>}
            </div>

            {/* 同好推荐列表 */}
            {recipientType === 'soulmate' && (
              <div className="soulmate-suggestions">
                {!selectedTrack && !historicalArtist ? (
                  <div className="no-suggestions" style={{ padding: '10px', color: '#666' }}>
                    🎵 Please select a song below first to find users who share your taste.
                  </div>
                ) : (
                  <>
                    <p className="suggestion-title flex items-center justify-between">
                      <span>Who also like your favorite "{historicalArtist || (selectedTrack ? selectedTrack.artists[0]?.name : 'this artist')}"</span>
                      {historicalArtists.length > 1 && (
                        <button 
                          onClick={handleRotateArtist}
                          className="refresh-soulmate-btn"
                          title="Change artist"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 2v6h-6"></path>
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                            <path d="M3 22v-6h6"></path>
                            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                          </svg>
                        </button>
                      )}
                    </p>
                    <div className="soulmate-list">
                      {isLoadingSoulmates ? (
                        <div className="loading-dots">Searching soulmates...</div>
                      ) : soulmateUsers.length > 0 ? (
                        soulmateUsers.map(soulmate => (
                          <div 
                            key={soulmate.id} 
                            className={`soulmate-item ${selectedTargetUserId === soulmate.id ? 'selected' : ''}`}
                            onClick={() => {
                              setRecipient(soulmate.firstName)
                              setSelectedTargetUserId(soulmate.id)
                            }}
                          >
                            {soulmate.avatarUrl ? (
                              <img src={soulmate.avatarUrl} alt={soulmate.firstName} className="soulmate-avatar" />
                            ) : (
                              <div className="soulmate-avatar-placeholder">{soulmate.firstName[0]}</div>
                            )}
                            <span className="soulmate-name">{soulmate.firstName}</span>
                          </div>
                        ))
                      ) : (
                        <div className="no-suggestions">
                          No fans found for this artist yet. System will pick a random music lover for you.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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
            <div className="visibility-header">
              <span className="visibility-label">This letter is</span>
              <select 
                className="visibility-select"
                value={isPublic ? 'public' : 'private'}
                onChange={(e) => setIsPublic(e.target.value === 'public')}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
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
                  <EmojiPicker 
                    onEmojiClick={handleEmojiSelect} 
                    width="100%" 
                    height={245} 
                    searchDisabled={true}
                    skinTonesDisabled={true}
                    previewConfig={{ showPreview: false }}
                  />
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
            style={{ marginBottom: '48px' }}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <Toast message="Letter is ready!" isVisible={showToast} onClose={handleToastClose} />

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content login-enhanced-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-header">💌</div>
            <h3 className="modal-title-main">Save Your Memory</h3>
            <p className="modal-subtitle-main">Create an account to keep your letters forever or continue as a guest.</p>
            
            <div className="login-actions-stack">
              <button className="gsi-material-button" onClick={handleGoogleLogin}>
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in with Google</span>
                </div>
              </button>

              <button className="secondary-guest-btn" onClick={handleGuestContinue}>
                Continue as Guest
              </button>
            </div>
            
            <button className="modal-dismiss-link" onClick={() => setShowLoginModal(false)}>
              Maybe later
            </button>
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
        
        /* 收件人类型选择器 */
        .recipient-type-select {
          padding: 4px 12px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          font-size: 13px;
          color: #333;
          background: #f8f9fa;
          cursor: pointer;
          outline: none;
        }

        .disabled-input {
          background-color: #f1f5f9 !important;
          color: #64748b !important;
          cursor: not-allowed;
          border-color: #e2e8f0 !important;
        }

        /* 同好推荐位 */
        .soulmate-suggestions {
          margin-top: 12px;
          padding: 12px;
          background: #fdf2f8;
          border-radius: 12px;
          border: 1px dashed #f9a8d4;
        }
        .suggestion-title {
          font-size: 12px;
          color: #be185d;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .soulmate-list {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .soulmate-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          min-width: 50px;
          transition: transform 0.2s;
        }
        .soulmate-item:hover {
          transform: translateY(-2px);
        }
        .soulmate-item.selected .soulmate-avatar,
        .soulmate-item.selected .soulmate-avatar-placeholder {
          border: 2px solid #be185d;
          transform: scale(1.1);
        }
        .soulmate-item.selected .soulmate-name {
          color: #be185d;
          font-weight: 600;
        }
        .soulmate-avatar, .soulmate-avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .soulmate-avatar-placeholder {
          background: #f472b6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .soulmate-name {
          font-size: 11px;
          color: #444;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 50px;
        }
        .loading-dots {
          font-size: 12px;
          color: #888;
          font-style: italic;
        }
        .no-suggestions {
          font-size: 12px;
          color: #999;
          margin: 0;
        }
        .modal-content {
          background: white; padding: 2.5rem 2rem; border-radius: 24px;
          width: 90%; max-width: 400px; text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .login-enhanced-modal {
          min-height: 480px; /* 增加高度约一倍 */
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .modal-icon-header {
          font-size: 48px;
          margin-bottom: 1.5rem;
        }
        .modal-title-main {
          font-size: 24px;
          font-weight: 850;
          margin-bottom: 0.75rem;
          letter-spacing: -0.5px;
        }
        .modal-subtitle-main {
          color: #666;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          padding: 0 10px;
        }
        .login-actions-stack {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 2.5rem;
        }
        .secondary-guest-btn {
          width: 100%;
          height: 40px;
          border-radius: 20px;
          border: 1px solid #e0e0e0;
          background: white;
          color: #444;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary-guest-btn:hover {
          background: #f9f9f9;
          border-color: #ccc;
        }
        .modal-dismiss-link {
          background: none;
          border: none;
          color: #999;
          font-size: 14px;
          text-decoration: underline;
          cursor: pointer;
        }

        /* Google Material Button Styles */
        .gsi-material-button {
          -moz-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -webkit-appearance: none;
          background-color: white;
          background-image: none;
          border: 1px solid #747775;
          -webkit-border-radius: 20px;
          border-radius: 20px;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
          color: #1f1f1f;
          cursor: pointer;
          font-family: 'Roboto', arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 40px;
          letter-spacing: 0.25px;
          outline: none;
          overflow: hidden;
          padding: 0 12px;
          position: relative;
          text-align: center;
          -transition: background-color .218s, border-color .218s, box-shadow .218s;
          transition: background-color .218s, border-color .218s, box-shadow .218s;
          vertical-align: middle;
          white-space: nowrap;
          width: 100%;
        }
        .gsi-material-button .gsi-material-button-icon {
          height: 20px;
          margin-right: 12px;
          min-width: 20px;
          width: 20px;
        }
        .gsi-material-button .gsi-material-button-content-wrapper {
          -webkit-align-items: center;
          align-items: center;
          display: flex;
          -webkit-flex-direction: row;
          flex-direction: row;
          -webkit-flex-wrap: nowrap;
          flex-wrap: nowrap;
          height: 100%;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .gsi-material-button .gsi-material-button-contents {
          -webkit-flex-grow: 1;
          flex-grow: 1;
          font-family: 'Roboto', arial, sans-serif;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: top;
        }
        .gsi-material-button .gsi-material-button-state {
          -webkit-transition: opacity .218s;
          transition: opacity .218s;
          bottom: 0;
          left: 0;
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
        }
        .gsi-material-button:hover {
          -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
          box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
        }
        .gsi-material-button:hover .gsi-material-button-state {
          background-color: #303030;
          opacity: 0.04;
        }
        .gsi-material-button:focus .gsi-material-button-state {
          background-color: #303030;
          opacity: 0.12;
        }
        .gsi-material-button:active .gsi-material-button-state {
          background-color: #303030;
          opacity: 0.12;
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
        .preview-hint { color: #888; margin-left: auto; font-size: 14px; }
        .emoji-hint { color: #888; margin-bottom: 8px; font-size: 14px; }
        
        .visibility-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; margin-bottom: 8px;
        }
        .visibility-label {
          font-size: 16px;
          font-weight: 500;
          color: #333;
        }
        .visibility-select {
          padding: 6px 32px 6px 12px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          font-size: 14px;
          background-color: white;
          color: #333;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M6 9L2 5H10L6 9Z' fill='%23666666' /%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        select.form-input {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M6 9L2 5H10L6 9Z' fill='%23666666' /%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }
        
        @media (max-width: 768px) {
          select.form-input {
            height: 48px; /* 增大高度与手机端input一致 */
          }
        }
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