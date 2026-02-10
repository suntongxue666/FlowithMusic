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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* 顶部标题栏 - 简化版，移除个人信息 */}
      <div className="mb-12">
        <h1 className="text-4xl font-black font-outfit tracking-tight text-gray-900 mb-2">
          My Letters
          <span className="ml-3 text-lg font-medium text-gray-400">({letters.length})</span>
        </h1>
        <p className="text-gray-500">A collection of your musical messages</p>
      </div>

      {/* Sync Banner */}
      {isAuthenticated && unsyncedCount > 0 && (
        <div className="mb-10 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl">☁️</div>
            <div>
              <h3 className="font-bold text-amber-900">Sync Guest Letters?</h3>
              <p className="text-sm text-amber-700 font-medium">We found {unsyncedCount} letters on this device. Sync them to your account now.</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-black"></div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading History</p>
        </div>
      ) : letters.length === 0 ? (
        <div className="text-center py-32 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-6 grayscale">📭</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No letters yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start by sending a musical letter to someone special.</p>
          <Link
            href="/send"
            className="inline-block px-10 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            Send a Letter
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((letter) => (
            <div
              key={letter.link_id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row items-center p-4 gap-4">
                {/* 左侧：封面图片 + 核心信息 */}
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  {/* Small Cover Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                    <img
                      src={letter.song_album_cover}
                      alt={letter.song_title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info: To, Song Title, Date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900 truncate">
                        To: {letter.recipient_name}
                      </h3>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        • {new Date(letter.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {letter.song_title} — {letter.song_artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        👁️ {letter.view_count || 0}
                      </span>
                      {letter.user_id ? (
                        <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                      ) : (
                        <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                  <button
                    onClick={() => handleCopyLink(letter.link_id)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-full text-xs font-bold border transition-all ${copyStatus === letter.link_id
                        ? 'bg-green-50 border-green-200 text-green-600'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 active:scale-95'
                      }`}
                  >
                    {copyStatus === letter.link_id ? 'Copied!' : 'Copy Link'}
                  </button>
                  <Link
                    href={`/letter/${letter.link_id}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-6 py-2 bg-black text-white rounded-full text-xs font-bold shadow-md hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header currentPage="history" />
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }>
        <HistoryContent />
      </Suspense>
    </main>
  )
}