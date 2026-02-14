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

function HistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null)

  // 同步状态
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [localLettersToSync, setLocalLettersToSync] = useState<Letter[]>([])

  useEffect(() => {
    checkAuthAndLoadLetters()

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

      /*
      // 1. 检查登录状态 (增加等待初始化确保状态准确)
      let currentUser = userService.getCurrentUser()
      
      // 如果没有用户，尝试从 Supabase Auth 恢复 (更积极的检查)
      if (!currentUser && supabase) {
         try {
           const { data: { user } } = await supabase.auth.getUser()
           if (user) {
             console.log('🔄 History: Recovered user from Supabase Auth:', user.id)
             currentUser = await userService.ensureUserExists(user)
           }
         } catch (e) {
            console.warn('⚠️ History: Auth check failed:', e)
         }
      }
      
      if (!currentUser) {
        console.log('⏳ History: User not in cache, waiting for initializeUser...')
        const initTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('init timeout')), 3000)
        )
        try {
          await Promise.race([userService.initializeUser(), initTimeout])
        } catch (e) {
          console.warn('⚠️ History: User initialization timed out, using local fallback')
        }
        currentUser = userService.getCurrentUser()
      }
      */

      // 1. 强制刷新用户状态
      let currentUser = await userService.getCurrentUserAsync();

      console.log('📋 History: Auth check result:', currentUser?.id);

      setIsAuthenticated(!!currentUser)
      setUser(currentUser)

      // 2. 加载本地 Letters (Guest Mode) - 增加鲁棒性过滤
      let localLetters: Letter[] = []
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
          // 从数据库加载
          if (currentUser) {
            dbLetters = await letterService.getUserLetters(currentUser.id)
          } else {
            dbLetters = await letterService.getUserLetters(undefined, anonymousId)
          }
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
        console.error('❌ History: Failed to load DB letters:', err)
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

  const handleUnlock = async (letter: Letter) => {
    if (!confirm(`Unlock "${letter.song_title}" with Flowing Emoji for $1.99?\n(Test Mode: This will simulate a successful payment)`)) return

    // Simulate API call
    const success = await letterService.updateLetterPaymentStatus(letter.link_id, 'flowing_emoji')

    if (success) {
      alert('Payment Successful! Link unlocked with Flowing Emoji.')
      // Refresh list to show "Copy Link" state
      checkAuthAndLoadLetters(true)
    } else {
      alert('Payment Failed. Please try again.')
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
          <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Nothing here</h3>
          <p className="text-gray-400 mb-6 text-sm">Start sharing your thoughts through music.</p>
          <Link
            href="/send"
            className="inline-flex px-8 py-3 bg-black text-white rounded-full font-bold hover:scale-105 transition-all"
            style={{ fontSize: 'calc(1rem - 4px)' }}
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewLetter(letter)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: '#f0f0f0',
                                color: '#666',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Preview Flowing Emoji
                            </button>
                            <button
                              onClick={() => handleUnlock(letter)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                background: '#f59e0b', // 橙黄色
                                color: '#fff',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              🔐 Unlock Link
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // 已解锁或标准模式：还是原来的 View, Copy Link 一行布局
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
                            background: copyStatus === letter.link_id ? '#22c55e' : (isUnlocked ? '#f59e0b' : '#333'), // Amber if unlocked
                            color: '#fff',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer'
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

      {/* Preview Overlay */}
      {previewLetter && previewLetter.animation_config?.emojis && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewLetter(null)}
        >
          <div className="absolute inset-0 pointer-events-none">
            <FlowingEffects
              emojis={previewLetter.animation_config.emojis}
              mode="preview"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl z-50 text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">Flowing Emoji Preview</h3>
            <p className="text-gray-500 mb-6">This effect will play for everyone who opens your letter.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setPreviewLetter(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewLetter(null);
                  handleUnlock(previewLetter);
                }}
                className="px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-opacity"
              >
                Unlock Now
              </button>
            </div>
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