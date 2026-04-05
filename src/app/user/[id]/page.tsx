'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { useUserState } from '@/hooks/useUserState'
import { Letter } from '@/lib/supabase'
import Header from '@/components/Header'
import FlowingEffects from '@/components/FlowingEffects'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

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

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React 19 use hook to unwrap params
  const { id: queryId } = use(params)
  
  const { user, isAuthenticated, isLoading: globalLoading } = useUserState()
  
  const [targetUser, setTargetUser] = useState<any>(null)
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLetter, setPaymentLetter] = useState<Letter | null>(null)

  const isSelf = isAuthenticated && user && user.id === queryId

  const loadData = async () => {
    setLoading(true)
    try {
      const userInfo = await letterService.getUserById(queryId)
      if (userInfo) {
        setTargetUser(userInfo)
      }
      
      const fetchedLetters = await letterService.getUserLetters(queryId)
      
      let displayLetters = fetchedLetters
      if (!isSelf) {
        displayLetters = fetchedLetters.filter(l => l.is_public)
      }
      setLetters(displayLetters)

    } catch (err) {
      console.error('Failed to load profile data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (queryId) {
      loadData()
    }
  }, [queryId, isSelf])

  // Record visit
  useEffect(() => {
    async function recordVisit() {
      if (!isSelf && user && targetUser) {
        try {
          await fetch(`/api/users/${queryId}/visit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitorId: user.id || user.anonymous_id,
              visitorName: user.display_name || user.email?.split('@')[0] || 'Anonymous',
              visitorAvatar: user.avatar_url
            })
          })
        } catch (e) {
          console.error('Failed to record visit', e)
        }
      }
    }
    
    recordVisit()
  }, [queryId, isSelf, user, targetUser])

  const handleCopyLink = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus(linkId)
      setTimeout(() => setCopyStatus(null), 2000)
    })
  }

  const handleSignOut = async () => {
    try {
      await userService.signOut()
      window.location.href = '/'
    } catch (e) {
      console.error('Sign out failed', e)
    }
  }

  const handleCopyFlowingLink = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}?emoji=flowing`
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus(linkId + '-flowing')
      setTimeout(() => setCopyStatus(null), 2000)
    })
  }

  const handleUnlock = (letter: Letter) => {
    setPaymentLetter(letter)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (letter: Letter) => {
    const success = await letterService.updateLetterPaymentStatus(letter.link_id, 'flowing_emoji')
    if (success) {
      setShowPaymentModal(false)
      setPaymentLetter(null)
      loadData()
    } else {
      alert('Payment verification failed. Please try again.')
    }
  }

  if (loading && !targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-6xl mb-4">👻</div>
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <Link href="/" className="mt-4 px-6 py-2 bg-black text-white rounded-full">Go Home</Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
      <Header />
      <div className="flex flex-col items-center py-8 sm:py-16 w-full px-4">

        {/* --- Profile Header --- */}
        <div className="w-full max-w-2xl mx-auto">
          <div
            className="mb-6 mt-6 flex flex-col items-center justify-center text-gray-900 relative w-full"
            style={{ minHeight: '200px' }}
          >

            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-[12px] border-2 border-gray-100 flex items-center justify-center bg-gray-50">
              {targetUser.avatar_url ? (
                <img src={targetUser.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2] w-full h-full flex items-center justify-center text-white">
                  {targetUser.display_name?.charAt(0) || targetUser.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="text-center">
              <h1 className="text-2xl font-bold">{targetUser.display_name || 'User'}</h1>
              {isSelf && targetUser.is_premium && targetUser.premium_until && (
                <p className="text-sm text-gray-500 mt-1">
                  Monthly Premium: {new Date(targetUser.premium_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} expires and auto-renews
                </p>
              )}
            </div>

            {isSelf && (
                <div className="flex flex-row items-center justify-center gap-3" style={{ marginTop: '24px' }}>
                  <Link
                    href="/premium"
                    className={`text-[12px] font-bold text-white bg-[#ff9800] rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105 active:scale-95 ${
                      (targetUser.is_premium || targetUser.is_admin || targetUser.id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981') ? '' : ''
                    }`}
                    style={{ padding: '8px 20px', minWidth: '100px', height: '36px', cursor: 'pointer' }}
                  >
                    👑 Premium
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="bg-black text-white hover:bg-gray-800 rounded-full text-[12px] font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    style={{ padding: '8px 20px', minWidth: '100px', height: '36px' }}
                  >
                    Sign Out
                  </button>
                </div>
            )}
          </div>
        </div>

        {/* --- Letters List --- */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 self-start w-full" style={{ marginTop: '12px', marginBottom: '12px' }}>
            {isSelf ? 'My Letters' : `${targetUser.display_name}'s Letters`}
          </h2>

          {letters.length === 0 ? (
            <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-16 w-full">
              <div className="text-5xl grayscale opacity-20 mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nothing here yet</h3>
              {isSelf && (
                <Link
                  href="/send"
                  className="inline-flex mt-4 bg-black text-white rounded-full font-bold hover:scale-105 transition-transform"
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  Create Letter
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center w-full">
              {letters.map((letter) => (
                <div
                  key={letter.link_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 w-full"
                  style={{ padding: '16px' }}
                >
                  <div className="flex flex-row items-center">
                    {/* 封面图片 - 可点击跳转 */}
                    <Link
                      href={`/letter/${letter.link_id}`}
                      className="flex-shrink-0 overflow-hidden"
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        display: 'block'
                      }}
                    >
                      <img
                        src={letter.song_album_cover}
                        alt={letter.song_title}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    {/* 内容区域 - 可点击跳转 */}
                    <Link
                      href={`/letter/${letter.link_id}`}
                      className="flex-1 min-w-0"
                      style={{ marginLeft: '16px', textDecoration: 'none' }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center' }}>
                        <span className="truncate">To: {letter.recipient_name}</span>
                        {letter.is_public === false && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px', 
                            backgroundColor: '#000', 
                            color: '#fff', 
                            fontSize: '10px', 
                            borderRadius: '4px', 
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                          }}>
                            Private
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#555', marginTop: '4px' }} className="truncate">
                        {letter.song_title} - {letter.song_artist}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        {new Date(letter.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </Link>

                    {/* 操作按钮 */}
                    <div className="flex flex-col items-end gap-2 text-right" style={{ marginLeft: '8px' }}>
                      {(() => {
                        // 增强的 Emoji 检测逻辑（处理可能的字符串或对象格式）
                        const getEmojis = (config: any) => {
                          if (!config) return [];
                          if (typeof config === 'string') {
                            try {
                              const parsed = JSON.parse(config);
                              return Array.isArray(parsed?.emojis) ? parsed.emojis : [];
                            } catch { return []; }
                          }
                          return Array.isArray(config?.emojis) ? config.emojis : [];
                        };
                        
                        const emojis = getEmojis(letter.animation_config);
                        const hasEmojis = emojis.length > 0;
                        const isUnlocked = letter.effect_type === 'flowing_emoji';

                        if (hasEmojis && !isUnlocked) {
                          return (
                            <div className="flex flex-col items-end gap-2">
                              {!isSelf && (
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
                              )}
                              <button
                                onClick={() => setPreviewLetter(letter)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
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
                              {isSelf && (
                                <button
                                  onClick={() => handleUnlock(letter)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                    color: '#fff',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(255, 165, 0, 0.3)'
                                  }}
                                >
                                  🔐 Unlock
                                </button>
                              )}
                              {isSelf && (
                                <button
                                  onClick={() => handleCopyLink(letter.link_id)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    background: copyStatus === letter.link_id ? '#22c55e' : '#333',
                                    color: '#fff',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {copyStatus === letter.link_id ? 'Copied' : 'Copy 🔗'}
                                </button>
                              )}
                            </div>
                          )
                        }

                        if (hasEmojis && isUnlocked) {
                          return (
                            <div className="flex flex-col items-end gap-2">
                              {!isSelf && (
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
                              )}
                              <button
                                onClick={() => setPreviewLetter(letter)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
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
                              {isSelf && (
                                <button
                                  onClick={() => handleCopyFlowingLink(letter.link_id)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
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
                              )}
                              {isSelf && (
                                <button
                                  onClick={() => handleCopyLink(letter.link_id)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '6px',
                                    background: copyStatus === letter.link_id ? '#22c55e' : '#333',
                                    color: '#fff',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {copyStatus === letter.link_id ? 'Copied' : 'Copy 🔗'}
                                </button>
                              )}
                            </div>
                          )
                        }

                        // Standard mode (no emojis, or for visitors on letters without emojis)
                        return (
                          <div className="flex flex-col items-end gap-2">
                            {!isSelf && (
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
                            )}
                            {isSelf && (
                              <button
                                onClick={() => handleCopyLink(letter.link_id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  background: copyStatus === letter.link_id ? '#22c55e' : '#333',
                                  color: '#fff',
                                  fontWeight: 500,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {copyStatus === letter.link_id ? 'Copied' : 'Copy 🔗'}
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 底部装饰 */}
      <div className="mt-20 py-10 text-center opacity-10">
        <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.6em]">Flowith Music</p>
      </div>

      {previewLetter && previewLetter.animation_config?.emojis && (
        <PreviewOverlay 
          letter={previewLetter} 
          onClose={() => setPreviewLetter(null)} 
          onUnlock={handleUnlock}
        />
      )}

      {showPaymentModal && paymentLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4">✨ Unlock Flowing Emoji</h3>
            <p className="text-gray-500 mb-6">Get the full-screen animation permanently for this letter.</p>
            
            <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] rounded-xl p-4 mb-6 text-white shadow-lg">
              <div className="font-bold text-lg">Limited Offer: $0.99 <span className="text-xs opacity-90 ml-2">⏳ 24h</span></div>
              <div className="text-xs opacity-80 mt-1">SAVE 50% Compared to standard price</div>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl mb-6">
              <img src={paymentLetter.song_album_cover} alt={paymentLetter.song_title} className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">To: {paymentLetter.recipient_name}</div>
                <div className="text-sm text-gray-600 truncate">{paymentLetter.song_title}</div>
                <div className="text-xs text-gray-400 truncate">{paymentLetter.song_artist}</div>
              </div>
            </div>

            <div className="min-h-[160px] -mx-2">
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                <PayPalButtons
                  style={{ layout: "vertical", shape: "pill" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [{
                        description: `Flowing Emoji for Letter to ${paymentLetter.recipient_name}`,
                        amount: {
                          currency_code: "USD",
                          value: "0.99"
                        }
                      }]
                    })
                  }}
                  onApprove={async (data, actions) => {
                    if (!actions || !actions.order) return Promise.reject("Order not found");
                    return actions.order.capture().then(async () => {
                      if (paymentLetter) handlePaymentSuccess(paymentLetter);
                    });
                  }}
                />
              </PayPalScriptProvider>
            </div>

            <button 
              className="w-full mt-4 py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors"
              onClick={() => setShowPaymentModal(false)}
            >
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
          .hidden-on-mobile { display: none !important; }
          .mobile-only-inline { display: inline !important; }
          .mobile-only-flex { display: flex !important; }
        }
        @media (min-width: 641px) {
          .mobile-only-inline { display: none !important; }
          .mobile-only-flex { display: none !important; }
        }
      `}</style>
    </main>
  )
}
