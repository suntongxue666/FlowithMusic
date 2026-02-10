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

  // 状态提示
  const loginStatus = searchParams.get('login')

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
      console.log('📂 History: Loaded local letters:', localLetters.length)

      let dbLetters: Letter[] = []

      // 3. 如果已登录，加载 DB Letters
      if (currentUser) {
        console.log('🔄 History: Fetching DB letters for user:', currentUser.id)
        try {
          dbLetters = await letterService.getUserLetters(currentUser.id)
          console.log('✅ History: Loaded DB letters:', dbLetters.length)

          // 4. 检查是否有未同步的本地信件
          if (localLetters.length > 0) {
            const dbLinkIds = new Set(dbLetters.map(l => l.link_id))
            const unsynced = localLetters.filter(l => !dbLinkIds.has(l.link_id))

            if (unsynced.length > 0) {
              console.log(`⚠️ History: Found ${unsynced.length} unsynced local letters`)
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

  const handleLogin = async () => {
    try {
      await userService.signInWithGoogle()
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please try again.')
    }
  }

  const handleLogout = async () => {
    await userService.signOut()
    setIsAuthenticated(false)
    setUser(null)
    setUnsyncedCount(0)
    checkAuthAndLoadLetters()
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* 顶部标题栏 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-outfit tracking-tight text-gray-900">
            My Letters
            <span className="ml-3 text-lg font-medium text-gray-400">({letters.length})</span>
          </h1>
          <p className="text-gray-500">History of your musical messages</p>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 bg-gray-50 p-2 pr-4 rounded-full border border-gray-100">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                  {user?.display_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                  {user?.display_name || user?.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] uppercase tracking-wider font-black text-gray-400 hover:text-red-500 text-left transition-colors"
                  disabled={isSyncing}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-all shadow-lg hover:scale-105 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
                <path d="M12.545,10.552v3.13h4.847c-0.21,1.15-0.891,2.115-1.921,2.786l-0.016,0.11l2.84,2.203l0.197,0.02c1.789-1.645,2.822-4.067,2.822-6.864c0-0.456-0.04-0.902-0.117-1.336H12.545z M12,20c2.179,0,4.009-0.722,5.344-1.956l-2.981-2.31c-0.655,0.477-1.536,0.803-2.363,0.803c-2.3,0-4.249-1.558-4.944-3.655l-0.106,0.009l-2.935,2.275l-0.038,0.114C5.394,18.06,8.441,20,12,20z M7.056,12.882C6.868,12.333,6.76,11.751,6.76,11.142c0-0.648,0.122-1.264,0.339-1.842l-0.006-0.119L4.09,6.866l-0.101,0.047C2.969,8.91,2.378,11.127,2.378,13.483c0,2.158,0.489,4.218,1.355,6.12L7.056,12.882z M12,4.896c1.649,0,3.016,0.732,3.951,1.603l2.864-2.864C17.078,1.868,14.678,0.86,12,0.86C8.441,0.86,5.394,2.799,3.876,5.77l3.033,2.352C7.601,6.014,9.589,4.406,12,4.896z" />
              </svg>
              Sign In to Sync
            </button>
          )}
        </div>
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
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start your journey by sending a musical letter to someone special.</p>
          <Link
            href="/send"
            className="inline-block px-10 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            Send a Letter
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {letters.map((letter) => (
            <div
              key={letter.link_id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex flex-col md:flex-row">
                {/* 音乐展示部分 - 窄条样式 */}
                <div
                  className="w-full md:w-[320px] h-[160px] relative overflow-hidden flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, #1DB95444 0%, #121212 100%)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center p-4 gap-4">
                    <div className="w-24 h-24 rounded-lg shadow-2xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                      <img
                        src={letter.song_album_cover}
                        alt={letter.song_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-white">
                      <h4 className="font-bold text-lg truncate mb-1">{letter.song_title}</h4>
                      <p className="text-gray-400 text-sm truncate uppercase tracking-wider font-medium">{letter.song_artist}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold text-gray-500 tracking-tighter uppercase">Musical Track</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 内容与操作部分 */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Recipient</p>
                        <h3 className="font-bold text-xl text-gray-900">To: {letter.recipient_name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Sent Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(letter.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Message Preview</p>
                      <p className="text-gray-600 line-clamp-2 italic font-outfit">
                        "{letter.message}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-[11px] font-bold text-gray-500">
                        <span>👁️ {letter.view_count || 0} Views</span>
                      </div>
                      {letter.user_id ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full text-[11px] font-bold text-green-600">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Synced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full text-[11px] font-bold text-orange-600">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                          Local Only
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(letter.link_id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all ${copyStatus === letter.link_id
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 shadow-sm active:scale-95'
                          }`}
                      >
                        {copyStatus === letter.link_id ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy Link
                          </>
                        )}
                      </button>
                      <Link
                        href={`/letter/${letter.link_id}`}
                        className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full text-sm font-bold shadow-md hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                      >
                        Visit Letter
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </Link>
                    </div>
                  </div>
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