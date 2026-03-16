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
      <div className="flex flex-col items-center py-8 sm:py-16">
        
        {/* --- Profile Header (Dark Themed) --- */}
        <div className="w-full max-w-2xl px-4">
          <div 
            className="bg-[#1a1a1a] rounded-2xl shadow-lg px-8 mb-10 mt-6 flex flex-col items-center justify-center text-white relative"
            style={{ height: '240px' }}
          >
            
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-[12px] border-2 border-white/20 flex items-center justify-center bg-gray-800">
              {targetUser.avatar_url ? (
                <img src={targetUser.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2] w-full h-full flex items-center justify-center text-white">
                  {targetUser.display_name?.charAt(0) || targetUser.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            
            {/* Info */}
            <h1 className="text-2xl font-bold mb-[12px]">{targetUser.display_name || 'User'}</h1>
            
            {isSelf && (
              <div className="flex flex-col items-center" style={{ gap: '12px' }}>
                <p className="text-sm text-white/60">{targetUser.email}</p>
                {targetUser.is_premium ? (
                  <div className="text-[11px] font-bold text-yellow-400 bg-yellow-400/10 rounded-full border border-yellow-400/20" style={{ padding: '6px 12px' }}>
                    👑 Premium until {targetUser.premium_until ? new Date(targetUser.premium_until).toISOString().split('T')[0] : ''}
                  </div>
                ) : (
                  <Link 
                    href="/premium" 
                    className="text-[12px] font-bold text-black bg-yellow-400 rounded-full hover:scale-105 transition-transform"
                    style={{ padding: '6px 12px' }}
                  >
                    👑 Premium
                  </Link>
                )}
                
                <button 
                  onClick={handleSignOut}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg text-sm font-medium transition-colors"
                  style={{ padding: '6px 12px', marginTop: '4px' }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Letters List (History Style) --- */}
        <div className="w-full max-w-2xl px-4 flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 px-2 self-start w-full" style={{ marginTop: '12px', marginBottom: '12px' }}>
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
                    {/* 封面图片 */}
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

                    {/* 内容区域 */}
                    <div className="flex-1 min-w-0" style={{ marginLeft: '16px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                        To: {letter.recipient_name}
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
                    </div>

                    {/* 操作按钮 (History 逻辑) */}
                    <div className="flex flex-col items-end gap-2 text-right">
                      {(() => {
                        const hasEmojis = letter.animation_config &&
                          Array.isArray(letter.animation_config.emojis) &&
                          letter.animation_config.emojis.length > 0;
                        const isUnlocked = letter.effect_type === 'flowing_emoji';

                        if (hasEmojis && !isUnlocked) {
                          return (
                            <div className="flex flex-col items-end gap-2">
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
                              <div className="flex flex-col items-end gap-2">
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
                                  onClick={() => handleUnlock(letter)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
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

                        if (hasEmojis && isUnlocked) {
                          return (
                            <div className="flex flex-col items-end gap-2">
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
                                background: copyStatus === letter.link_id ? '#22c55e' : (isUnlocked ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#333'),
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
            
            <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] rounded-xl p-4 mb-6 text-white shadow-lg animate-pulse">
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
                        description: `Flowing Emoji for Letter: ${paymentLetter.song_id}`,
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
                      handlePaymentSuccess(paymentLetter);
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
      `}</style>
    </main>
  )
}
