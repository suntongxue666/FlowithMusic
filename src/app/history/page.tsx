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

      // 1. 检查登录状态 (增加等待初始化确保状态准确)
      let currentUser = userService.getCurrentUser()
      if (!currentUser) {
        console.log('⏳ History: User not in cache, waiting for initializeUser...')
        await userService.initializeUser()
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
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-4xl min-h-screen">
      {/* 顶部标题栏 */}
      <div className="mb-10 px-2">
        <h1 className="text-3xl sm:text-5xl font-black font-outfit tracking-tight text-gray-900 mb-2 flex items-baseline gap-2">
          My Letters
          <span className="text-sm font-bold text-gray-300">/ {letters.length}</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 font-medium tracking-wide">Your collection of musical messages</p>
      </div>

      {/* Sync Banner */}
      {isAuthenticated && unsyncedCount > 0 && (
        <div className="mb-8 p-5 bg-black text-white rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl shadow-gray-200">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">☁️</div>
            <div>
              <h3 className="font-bold text-white leading-tight">Sync local data</h3>
              <p className="text-[10px] text-white/50 font-medium">Found {unsyncedCount} letters to sync</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
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
        <div className="text-center py-32 bg-white rounded-[40px] border border-gray-100 shadow-sm">
          <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Nothing here</h3>
          <p className="text-gray-400 mb-10 text-sm max-w-xs mx-auto">Start sharing your thoughts through music.</p>
          <Link
            href="/send"
            className="inline-flex px-12 py-4 bg-black text-white rounded-full font-bold hover:scale-105 transition-all shadow-xl shadow-gray-200"
          >
            Create Letter
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((letter) => (
            <div
              key={letter.link_id}
              className="group bg-white border border-gray-100/50 rounded-[32px] p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-500"
            >
              <div className="flex flex-row items-center gap-4">
                {/* 封面图片 - 强制固定尺寸，防止巨型图片出现 */}
                <div
                  className="flex-shrink-0 relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 h-[64px] w-[64px] sm:h-[80px] sm:w-[80px]"
                  style={{ width: '64px', height: '64px' }} // 移动端强制 64px
                >
                  <img
                    src={letter.song_album_cover}
                    alt={letter.song_title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    style={{ minWidth: '100%', minHeight: '100%' }}
                  />
                </div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate tracking-tight">
                      To: {letter.recipient_name}
                    </h3>
                    <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">
                      {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-gray-700 truncate leading-tight">
                      {letter.song_title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate italic opacity-80">
                      {letter.song_artist}
                    </p>
                  </div>

                  {/* 云端/本地状态 */}
                  <div className="mt-2 flex items-center gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    <div className={`w-1.5 h-1.5 rounded-full ${letter.user_id ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600">
                      {letter.user_id ? 'Synced' : 'Local'}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 - 紧凑排列 */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pr-1">
                  <button
                    onClick={() => handleCopyLink(letter.link_id)}
                    className={`h-9 w-9 sm:h-10 sm:w-auto sm:px-4 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all ${copyStatus === letter.link_id
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-900 hover:text-gray-900'
                      }`}
                    title="Copy Link"
                  >
                    <span className="hidden sm:inline text-[10px] font-black tracking-widest uppercase">{copyStatus === letter.link_id ? 'Copied' : 'Link'}</span>
                    <span className="sm:hidden text-lg">{copyStatus === letter.link_id ? '✓' : '🔗'}</span>
                  </button>
                  <Link
                    href={`/letter/${letter.link_id}`}
                    className="h-9 w-9 sm:h-10 sm:w-auto sm:px-6 flex items-center justify-center bg-black text-white rounded-xl sm:rounded-2xl transition-all hover:scale-105 active:scale-95"
                    title="View Letter"
                  >
                    <span className="hidden sm:inline text-[10px] font-black tracking-widest uppercase">Open</span>
                    <span className="sm:hidden text-lg">↗</span>
                  </Link>
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