'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { Letter } from '@/lib/supabase'
import Link from 'next/link'

function HistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

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

  const checkAuthAndLoadLetters = async () => {
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

      // 1. 检查登录状态 (增加等待初始化确保状态准确)
      let currentUser = userService.getCurrentUser()
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

      // 3. 如果已登录，加载 DB Letters
      if (currentUser) {
        try {
          dbLetters = await letterService.getUserLetters(currentUser.id)
          dbLetters = (dbLetters || []).filter(l => l && l.link_id)

          // 4. 检查是否有未同步的本地信件
          if (localLetters.length > 0) {
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
      }

      // 5. 合并并去重
      const letterMap = new Map<string, Letter>()
      localLetters.forEach(l => letterMap.set(l.link_id, l))
      dbLetters.forEach(l => letterMap.set(l.link_id, l))

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

  return (
    <div className="min-h-screen flex flex-col items-center py-8 sm:py-16" style={{ backgroundColor: '#fafafa' }}>
      {/* 顶部标题栏 - 居中 */}
      <div className="mb-8 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          My Letters
        </h1>
      </div>

      {/* Sync Banner */}
      {isAuthenticated && unsyncedCount > 0 && (
        <div className="mb-8 p-5 bg-black text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl" style={{ width: '100%', maxWidth: '600px' }}>
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">☁️</div>
            <div>
              <h3 className="font-bold text-white leading-tight">Sync local data</h3>
              <p className="text-xs text-white/50">Found {unsyncedCount} letters to sync</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-6 py-2 bg-white text-black font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-black animate-spin"></div>
        </div>
      ) : letters.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm" style={{ width: '100%', maxWidth: '600px' }}>
          <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nothing here</h3>
          <p className="text-gray-400 mb-10 text-sm">Start sharing your thoughts through music.</p>
          <Link
            href="/send"
            className="inline-flex px-8 py-3 bg-black text-white rounded-full font-bold hover:scale-105 transition-all"
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

                {/* 操作按钮 - 右边距 */}
                <div className="flex items-center gap-2" style={{ marginRight: '0' }}>
                  <Link
                    href={`/letter/${letter.link_id}`}
                    className="inline-block"
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部装饰 */}
      <div className="mt-20 py-10 text-center opacity-10">
        <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.6em]">Flowith Music</p>
      </div>

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