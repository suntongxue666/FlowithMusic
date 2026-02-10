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
  }, [searchParams])

  const checkAuthAndLoadLetters = async () => {
    try {
      setLoading(true)

      // 1. 检查登录状态
      const currentUser = userService.getCurrentUser()
      setIsAuthenticated(!!currentUser)
      setUser(currentUser)

      // 2. 加载本地 Letters (Guest Mode)
      const localLetters: Letter[] = JSON.parse(localStorage.getItem('letters') || '[]')

      let dbLetters: Letter[] = []

      // 3. 如果已登录，加载 DB Letters
      if (currentUser) {
        try {
          dbLetters = await letterService.getUserLetters(currentUser.id)

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
    <div className="container mx-auto px-3 sm:px-6 py-8 sm:py-16 max-w-4xl">
      {/* 顶部标题栏 - 简化版，增强质感 */}
      <div className="mb-10 sm:mb-14 px-1">
        <h1 className="text-3xl sm:text-5xl font-black font-outfit tracking-tight text-gray-900 mb-2 sm:mb-3 flex items-baseline gap-3">
          My Letters
          <span className="text-base sm:text-xl font-medium text-gray-300">/ {letters.length}</span>
        </h1>
        <p className="text-sm sm:text-lg text-gray-400 font-medium">Musical memories shared from your heart</p>
      </div>

      {/* Sync Banner - H5 适配 */}
      {isAuthenticated && unsyncedCount > 0 && (
        <div className="mb-8 p-5 sm:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">☁️</div>
            <div>
              <h3 className="font-bold text-amber-900">Sync local letters?</h3>
              <p className="text-xs sm:text-sm text-amber-700/80 font-medium">We found {unsyncedCount} letters on this device.</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-200 active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gray-100"></div>
            <div className="w-12 h-12 rounded-full border-4 border-t-black absolute inset-0 animate-spin"></div>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Authenticating</p>
        </div>
      ) : letters.length === 0 ? (
        <div className="text-center py-24 sm:py-32 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
          <div className="text-6xl mb-6 opacity-20">📭</div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Empty Space</h3>
          <p className="text-sm text-gray-400 mb-10 max-w-[240px] sm:max-w-sm mx-auto">Your musical journey starts here. Send your first letter now.</p>
          <Link
            href="/send"
            className="inline-flex items-center gap-2 px-10 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 hover:scale-105 active:scale-95"
          >
            Create Letter
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {letters.map((letter) => (
            <div
              key={letter.link_id}
              className="group bg-white border border-gray-50 rounded-[28px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-4 sm:p-5 gap-4">
                {/* 左侧：核心信息 */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Small Cover Image - 增加圆角与阴影 */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 shadow-sm relative group-hover:rotate-3 transition-transform duration-500">
                    <img
                      src={letter.song_album_cover}
                      alt={letter.song_title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
                  </div>

                  {/* Info: To, Song Title, Date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate tracking-tight">
                        To: {letter.recipient_name}
                      </h3>
                      <span className="hidden sm:inline text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                        • {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-gray-700 truncate leading-tight">
                        {letter.song_title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate italic antialiased">
                        {letter.song_artist}
                      </p>
                    </div>

                    {/* H5 专属时间展示 */}
                    <div className="flex sm:hidden items-center gap-2 mt-2">
                      <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest">
                        {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="w-1 h-1 bg-gray-100 rounded-full"></div>
                      <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest">
                        👁️ {letter.view_count || 0}
                      </span>
                    </div>

                    {/* Desktop 统计 */}
                    <div className="hidden sm:flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-md">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Views</span>
                        <span className="text-[10px] font-bold text-gray-900">{letter.view_count || 0}</span>
                      </div>
                      {letter.user_id ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50/50 rounded-md">
                          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Cloud</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50/50 rounded-md">
                          <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Local</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：操作按钮 - H5 横向紧凑化 */}
                <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0 sm:pl-4">
                  <button
                    onClick={() => handleCopyLink(letter.link_id)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-5 py-3 sm:py-2.5 rounded-2xl text-[11px] font-black tracking-wider uppercase transition-all border ${copyStatus === letter.link_id
                        ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 active:scale-95 shadow-sm'
                      }`}
                  >
                    {copyStatus === letter.link_id ? 'Copied' : 'Link'}
                  </button>
                  <Link
                    href={`/letter/${letter.link_id}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-8 py-3 sm:py-2.5 bg-black text-white rounded-2xl text-[11px] font-black tracking-wider uppercase shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部装饰 - 减少白墙感 */}
      <div className="mt-20 pt-10 border-t border-gray-50 text-center">
        <p className="text-[10px] font-black text-gray-200 uppercase tracking-[0.4em]">Flowith Music</p>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
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