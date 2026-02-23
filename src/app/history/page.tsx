'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { Letter } from '@/lib/supabase'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import Link from 'next/link'
import FlowingEffects from '@/components/FlowingEffects'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

// 预览弹窗组件 - 5秒自动关闭
function PreviewOverlay({ 
  letter, 
  onClose, 
  onUnlock 
}: { 
  letter: Letter
  onClose: () => void
  onUnlock: (letter: Letter) => void 
}) {
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    // 10秒倒计时
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute inset-0 pointer-events-none">
        <FlowingEffects
          emojis={letter.animation_config?.emojis || []}
          mode="preview"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-xl z-50 text-center max-w-sm mx-4" style={{ padding: "12px" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-3">✨ Flowing Emoji Preview</h3>
        <p className="text-gray-500 mb-2 text-sm leading-relaxed">This effect will play for everyone who opens your letter.</p>
        <p className="text-sm text-gray-400 mb-6">Auto-close in {countdown}s</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onUnlock(letter);
            }}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 165, 0, 0.3)'
            }}
          >
            🔐 Unlock Now
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLetter, setPaymentLetter] = useState<Letter | null>(null)

  // 同步状态
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [localLettersToSync, setLocalLettersToSync] = useState<Letter[]>([])

  useEffect(() => {
    // 检查是否从Send页面跳转来，需要强制刷新
    const needRefresh = searchParams.get('refresh') === '1'
    checkAuthAndLoadLetters(needRefresh)

    // 新增：当窗口获得焦点时刷新数据（例如从社交媒体分享回来或从发送页返回）
    if (typeof window !== 'undefined') {
      const handleFocus = () => {
        console.log('📱 History: Window focused, refreshing...')
        checkAuthAndLoadLetters()
      }
      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
  }, [searchParams])

  const checkAuthAndLoadLetters = async (forceRefresh: boolean = false) => {
    // 初始化变量，确保在所有作用域中可用
    let localLetters: Letter[] = [];
    let currentUser = null;

    try {
      setLoading(true)

      // 0. 检查是否有待发送的信件（登录后返回继续发送）
      const loginStatus = searchParams.get('login')
      if (loginStatus === 'success') {
        const pendingLetter = localStorage.getItem('pending_letter')
        if (pendingLetter) {
          console.log('🔄 History: Found pending letter, redirecting back to Send page...')
          router.push('/send?resume=1')
          return
        }
      }

      // 1. 强制刷新用户状态（增加超时保护）
      try {
        const userPromise = userService.getCurrentUserAsync();
        const userTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        currentUser = await Promise.race([userPromise, userTimeout]) as any;
        console.log('📋 History: Auth check result:', currentUser?.id);
      } catch (e) {
        console.warn('⚠️ History: Auth check timed out or failed, using fallback:', e);
        // 超时后使用本地缓存的用户状态（如果有的话）
        currentUser = userService.getCurrentUser();
      }

      setIsAuthenticated(!!currentUser)
      setUser(currentUser)

      // 2. 加载本地 Letters (Guest Mode) - 增加鲁棒性过滤
      try {
        const raw = localStorage.getItem('letters')
        localLetters = JSON.parse(raw || '[]')
        if (!Array.isArray(localLetters)) localLetters = []
        // 关键修复：过滤掉 null 值，防止 link_id 读取失败
        localLetters = localLetters.filter(l => l && typeof l === 'object' && l.link_id)
      } catch (e) {
        localLetters = []
      }

      let dbLetters: Letter[] = []

      // 3. 加载 DB Letters (登录用户用 userId，未登录用 anonymousId)
      // 优先使用缓存，避免每次都从数据库加载
      const cacheKey = 'history_letters_cache'
      const cacheTimeKey = 'history_letters_cache_time'
      const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

      const cachedData = localStorage.getItem(cacheKey)
      const cacheTime = localStorage.getItem(cacheTimeKey)
      const now = Date.now()
      const isCacheValid = cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION

      const anonymousId = ImprovedUserIdentity.getOrCreateIdentity().id
      console.log('📋 History: Loading letters', { currentUser: !!currentUser, anonymousId, isCacheValid, forceRefresh: forceRefresh })

      try {
        if (!forceRefresh && isCacheValid && cachedData) {
          // 使用缓存数据
          dbLetters = JSON.parse(cachedData)
          console.log('📋 History: Using cached letters', dbLetters.length)
        } else {
          // 从数据库加载（增加超时保护）
          const dbPromise = currentUser
            ? letterService.getUserLetters(currentUser.id)
            : letterService.getUserLetters(undefined, anonymousId);

          const dbTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DB query timeout')), 10000)
          );

          dbLetters = await Promise.race([dbPromise, dbTimeout]) as Letter[];

          console.log('📋 History: DB letters loaded', dbLetters.length, dbLetters.map(l => l.link_id))
          // 更新缓存
          localStorage.setItem(cacheKey, JSON.stringify(dbLetters))
          localStorage.setItem(cacheTimeKey, now.toString())
        }
        dbLetters = (dbLetters || []).filter(l => l && l.link_id)

        // 4. 检查是否有未同步的本地信件 (仅登录用户)
        if (currentUser && localLetters.length > 0) {
          const dbLinkIds = new Set(dbLetters.map(l => l.link_id))
          const unsynced = localLetters.filter(l => !dbLinkIds.has(l.link_id))

          if (unsynced.length > 0) {
            setUnsyncedCount(unsynced.length)
            setLocalLettersToSync(unsynced)
          } else {
            setUnsyncedCount(0)
          }
        }
      } catch (err) {
        console.error('❌ History: Failed to load DB letters:', err);
        // 如果数据库加载失败，清除缓存，下次重试
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimeKey);
        // 继续使用本地数据，不阻断用户
        dbLetters = [];
      }

      // 5. 合并并去重 (关键修复：深度合并，确保本地的 animation_config 不被 DB 的覆盖)
      const letterMap = new Map<string, Letter>()
      localLetters.forEach(l => {
        if (l && l.link_id) letterMap.set(l.link_id, { ...l })
      })
      dbLetters.forEach(l => {
        if (l && l.link_id) {
          const existing = letterMap.get(l.link_id)
          // 如果本地已有且带有动画配置，而 DB 版没有，则保留动画配置
          letterMap.set(l.link_id, {
            ...existing,
            ...l,
            animation_config: l.animation_config || existing?.animation_config
          } as Letter)
        }
      })

      const mergedLetters = Array.from(letterMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setLetters(mergedLetters)

    } catch (error) {
      console.error('💥 History: Error loading data:', error)
      // 发生错误时，至少显示本地数据
      setLetters(localLetters)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!user || unsyncedCount === 0) return

    setIsSyncing(true)
    try {
      const result = await letterService.migrateGuestLetters(localLettersToSync, user.id)

      if (result.success > 0) {
        alert(`Successfully synced ${result.success} letters!`)
        localStorage.removeItem('letters')
        setUnsyncedCount(0)
        setLocalLettersToSync([])
        checkAuthAndLoadLetters()
      } else if (result.fail > 0) {
        alert(`Failed to sync some letters. Please try again.`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed occurred.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCopyLink = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus(linkId)
      setTimeout(() => setCopyStatus(null), 2000)
    })
  }

  // 复制带Flowing Emoji效果的链接
  const handleCopyFlowingLink = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}?emoji=flowing`
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus(linkId + '-flowing')
      setTimeout(() => setCopyStatus(null), 2000)
    })
  }

  // 旧的handleCopyLink函数（将被删除）
  const _handleCopyLinkOld = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus(linkId)
      setTimeout(() => setCopyStatus(null), 2000)
    })
  }

  const handleUnlock = async (letter: Letter) => {
    // 设置支付弹窗
    setPaymentLetter(letter)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (letter: Letter) => {
    // 更新数据库
    const success = await letterService.updateLetterPaymentStatus(letter.link_id, 'flowing_emoji')

    if (success) {
      setShowPaymentModal(false)
      setPaymentLetter(null)
      // Refresh list to show "Copy Link" state
      checkAuthAndLoadLetters(true)
    } else {
      alert('Payment verification failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-8 sm:py-16" style={{ backgroundColor: '#fafafa' }}>
      {/* 顶部标题栏 - 居中，带刷新按钮 */}
      <div className="mb-10 flex items-center justify-center gap-4" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          My Letters
        </h1>
        <button
          onClick={() => checkAuthAndLoadLetters(true)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="刷新"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-black animate-spin"></div>
        </div>
      ) : letters.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm" style={{ width: '100%', maxWidth: '600px', paddingTop: '85px', paddingBottom: '85px' }}>
          <div className="text-6xl grayscale opacity-20" style={{ marginBottom: '18px' }}>📭</div>
          <h3 className="text-2xl font-bold text-gray-900" style={{ marginBottom: '18px' }}>Nothing here</h3>
          <p className="text-gray-400 text-sm" style={{ marginBottom: '18px' }}>Start sharing your thoughts through music.</p>
          <Link
            href="/send"
            className="inline-flex bg-black text-white rounded-full font-bold hover:scale-105 transition-all"
            style={{ fontSize: 'calc(1rem - 4px)', padding: '8px 12px' }}
          >
            Create Letter
          </Link>
        </div>
      ) : (
        <div className="space-y-6 flex flex-col items-center" style={{ width: '100%' }}>
          {letters.map((letter) => (
            <div
              key={letter.link_id}
              className="bg-white rounded-lg shadow-sm border border-gray-100"
              style={{ padding: '16px', width: '100%', maxWidth: '600px' }}
            >
              <div className="flex flex-row items-center">
                {/* 封面图片 - 60x60 圆角方形（增大50%） */}
                <div
                  className="flex-shrink-0 overflow-hidden"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px'
                  }}
                >
                  <img
                    src={letter.song_album_cover}
                    alt={letter.song_title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 内容区域 - 三行布局，左边距16px */}
                <div className="flex-1 min-w-0" style={{ marginLeft: '16px' }}>
                  {/* 第一行：收件人 */}
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                    To: {letter.recipient_name}
                  </div>
                  {/* 第二行：歌名 - 歌手 */}
                  <div style={{ fontSize: '14px', color: '#555', marginTop: '4px' }} className="truncate">
                    {letter.song_title} - {letter.song_artist}
                  </div>
                  {/* 第三行：时间 */}
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {new Date(letter.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* 操作按钮 - 右侧对齐 */}
                <div className="flex flex-col items-end gap-2" style={{ marginRight: '0' }}>
                  {(() => {
                    const hasEmojis = letter.animation_config &&
                      Array.isArray(letter.animation_config.emojis) &&
                      letter.animation_config.emojis.length > 0;
                    const isUnlocked = letter.effect_type === 'flowing_emoji';

                    // 如果有 Emoji 且未解锁：两行布局
                    if (hasEmojis && !isUnlocked) {
                      return (
                        <div className="flex flex-col items-end gap-2 text-right">
                          {/* 第一行：View + Copy Link (之前的按钮在一行) */}
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/letter/${letter.link_id}`}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: '#f0f0f0',
                                color: '#666',
                                fontWeight: 500,
                                textDecoration: 'none'
                              }}
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleCopyLink(letter.link_id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: copyStatus === letter.link_id ? '#22c55e' : '#333',
                                color: '#fff',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              {copyStatus === letter.link_id ? 'Copied' : 'Copy Link'}
                            </button>
                          </div>

                          {/* 第二行：Preview + Unlock (新增的按钮在一行) */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => setPreviewLetter(letter)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: '#22c55e', // 绿色
                                color: '#fff',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              👁 Flowing Emoji
                            </button>
                            <button
                              onClick={() => handleUnlock(letter)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: 'linear-gradient(45deg, #FFD700, #FFA500)', // 金色渐变
                                color: '#fff',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(255, 165, 0, 0.3)'
                              }}
                            >
                              🔐 Unlock Letter
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // 已解锁：只显示 Preview + 金色 Copy Link
                    if (hasEmojis && isUnlocked) {
                      return (
                        <div className="flex flex-col items-end gap-2 text-right">
                          <button
                            onClick={() => setPreviewLetter(letter)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              borderRadius: '6px',
                              background: '#22c55e',
                              color: '#fff',
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            👁 Flowing Emoji
                          </button>
                          <button
                            onClick={() => handleCopyFlowingLink(letter.link_id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              borderRadius: '6px',
                              background: copyStatus === letter.link_id + '-flowing' ? '#22c55e' : 'linear-gradient(45deg, #FFD700, #FFA500)',
                              color: '#fff',
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(255, 165, 0, 0.3)'
                            }}
                          >
                            {copyStatus === letter.link_id + '-flowing' ? 'Copied' : 'Copy Link ✨'}
                          </button>
                        </div>
                      )
                    }

                    // 标准模式（无Emoji）
                    return (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/letter/${letter.link_id}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            background: '#f0f0f0',
                            color: '#666',
                            fontWeight: 500,
                            textDecoration: 'none'
                          }}
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleCopyLink(letter.link_id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            background: copyStatus === letter.link_id ? '#22c55e' : (isUnlocked ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#333'), // 金色 if unlocked
                            color: '#fff',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: isUnlocked ? '0 2px 8px rgba(255, 165, 0, 0.3)' : 'none'
                          }}
                        >
                          {copyStatus === letter.link_id ? 'Copied' : (isUnlocked ? 'Copy Link ✨' : 'Copy Link')}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部装饰 */}
      <div className="mt-20 py-10 text-center opacity-10">
        <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.6em]">Flowith Music</p>
      </div>

      {/* Preview Overlay - 5秒自动消失 */}
      {previewLetter && previewLetter.animation_config?.emojis && (
        <PreviewOverlay 
          letter={previewLetter} 
          onClose={() => setPreviewLetter(null)} 
          onUnlock={handleUnlock}
        />
      )}

      {/* PayPal Payment Modal */}
      {showPaymentModal && paymentLetter && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
            <h3>✨ Unlock Flowing Emoji</h3>
            <p className="payment-description">
              Get the full-screen animation permanently for this letter.
            </p>
            <div className="promotion-banner">
              <div className="promotion-text">Limited Offer: $0.99 <span className="small-text">⏳ 24 Hours Only</span></div>
              <span className="promotion-badge">SAVE 50%</span>
              <div className="purchase-count">
                {Math.floor(Math.random() * 39) + 11} purchases in last 24 hours
              </div>
            </div>
            <div className="payment-letter-info">
              <img src={paymentLetter.song_album_cover} alt={paymentLetter.song_title} className="payment-cover" />
              <div className="payment-details">
                <div className="payment-recipient">To: {paymentLetter.recipient_name}</div>
                <div className="payment-song">{paymentLetter.song_title}</div>
                <div className="payment-artist">{paymentLetter.song_artist}</div>
              </div>
            </div>
            <div className="paypal-container">
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                <PayPalButtons
                  style={{ layout: "vertical", shape: "pill" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [{
                        description: `Flowing Emoji for Letter: ${paymentLetter.song_title}`,
                        amount: {
                          currency_code: "USD",
                          value: "0.99"
                        }
                      }]
                    })
                  }}
                  onApprove={async (data, actions) => {
                    if (!actions.order) return Promise.reject("Order not found");
                    return actions.order.capture().then(async (details) => {
                      console.log('Transaction completed by ' + details?.payer?.name?.given_name);
                      handlePaymentSuccess(paymentLetter);
                    });
                  }}
                  onError={(err) => {
                    console.error('PayPal Error:', err);
                    alert('Payment failed. Please try again.');
                  }}
                />
              </PayPalScriptProvider>
            </div>
            <button className="close-payment-btn" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          background-color: #fafafa !important;
        }
        @media (max-width: 640px) {
          .container {
             padding-bottom: 5rem;
          }
        }
      `}</style>

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

        .modal-content.payment-modal {
          background: white;
          padding: 32px 28px;
          border-radius: 20px;
          width: 90%;
          max-width: 420px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }

        .payment-modal h3 {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .payment-description {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .promotion-banner {
          background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
          border-radius: 12px;
          padding: 14px 20px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
          }
        }

        .promotion-text {
          color: white;
          font-size: 16px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .small-text {
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }

        .promotion-badge {
          background: white;
          color: #FF6B6B;
          font-size: 14px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          text-align: center;
          align-self: center;
        }

        .purchase-count {
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          opacity: 0.95;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .payment-letter-info {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8f8f8;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 24px;
        }

        .payment-cover {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          object-fit: cover;
        }

        .payment-details {
          text-align: left;
        }

        .payment-song {
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .payment-artist {
          font-size: 13px;
          color: #666;
        }

        .paypal-container {
          min-height: 160px;
          margin: 0 -8px;
        }

        .close-payment-btn {
          margin-top: 20px;
          padding: 12px 32px;
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          font-size: 15px;
        }

        .close-payment-btn:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen">
      <Header currentPage="history" />
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-8 h-8 rounded-full border-2 border-gray-100 border-t-black animate-spin"></div>
        </div>
      }>
        <HistoryContent />
      </Suspense>
    </main>
  )
}