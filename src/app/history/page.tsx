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
              // 如果本地信件都已经同步了，可以清理本地存储吗？
              // 暂时不自动清理，以免误删。但在同步成功后会清理。
            }
          }
        } catch (err) {
          console.error('❌ History: Failed to load DB letters:', err)
        }
      }

      // 5. 合并并去重
      // 以 link_id 为准进行去重
      const letterMap = new Map<string, Letter>()

      // 先放入本地的（通常是最新的）
      localLetters.forEach(l => letterMap.set(l.link_id, l))

      // 再放入 DB 的（如果有冲突，以 DB 为准？还是本地为准？通常 DB 更可靠，但本地可能更新
      // 这里选择: 如果 DB 有，覆盖本地的（因为 DB 是 source of truth）
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
        // 清理本地存储，防止重复提示
        // 也可以保留，但为了用户体验，同步后清理是合理的
        localStorage.removeItem('letters')
        setUnsyncedCount(0)
        setLocalLettersToSync([])

        // 重新加载列表（从 DB 拉取最新）
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
    // 重新加载（只显示本地）
    checkAuthAndLoadLetters()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 顶部状态栏 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold font-outfit">My Letters ({letters.length})</h1>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user?.display_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSyncing}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-[#333] text-white text-sm font-medium rounded-md hover:bg-black transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" className="w-4 h-4">
                <path fill="currentColor" d="M12.545,10.552v3.13h4.847c-0.21,1.15-0.891,2.115-1.921,2.786l-0.016,0.11l2.84,2.203l0.197,0.02c1.789-1.645,2.822-4.067,2.822-6.864c0-0.456-0.04-0.902-0.117-1.336H12.545z M12,20c2.179,0,4.009-0.722,5.344-1.956l-2.981-2.31c-0.655,0.477-1.536,0.803-2.363,0.803c-2.3,0-4.249-1.558-4.944-3.655l-0.106,0.009l-2.935,2.275l-0.038,0.114C5.394,18.06,8.441,20,12,20z M7.056,12.882C6.868,12.333,6.76,11.751,6.76,11.142c0-0.648,0.122-1.264,0.339-1.842l-0.006-0.119L4.09,6.866l-0.101,0.047C2.969,8.91,2.378,11.127,2.378,13.483c0,2.158,0.489,4.218,1.355,6.12L7.056,12.882z M12,4.896c1.649,0,3.016,0.732,3.951,1.603l2.864-2.864C17.078,1.868,14.678,0.86,12,0.86C8.441,0.86,5.394,2.799,3.876,5.77l3.033,2.352C7.601,6.014,9.589,4.406,12,4.896z" />
              </svg>
              Sign In to Sync
            </button>
          )}
        </div>
      </div>

      {/* 登录成功/失败提示 */}
      {loginStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          ✅ Successfully logged in! Your letters are being synced.
        </div>
      )}

      {loginStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          ⚠️ Login failed. Please try again.
        </div>
      )}

      {/* 同步提示 Banner */}
      {isAuthenticated && unsyncedCount > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <h3 className="font-medium text-amber-900">Sync your guest letters?</h3>
              <p className="text-sm text-amber-700">We found {unsyncedCount} letters saved on this device. Sync them to your account to keep them safe forever.</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* 未登录时的游客提示 */}
      {!isAuthenticated && letters.length > 0 && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
          <p><strong>Note:</strong> You are viewing letters saved on this device (Guest Mode). </p>
          <p className="mt-1">Log in to save them to the cloud and access them from other devices.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : letters.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No letters yet</h3>
          <p className="text-gray-500 mb-6">Create your first musical letter to share with friends.</p>
          <Link
            href="/send"
            className="inline-block px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-transform hover:scale-105"
          >
            Send a Letter
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {letters.map((letter) => (
            <Link
              href={`/letter/${letter.link_id}`}
              key={letter.link_id}
              className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square relative bg-gray-100 overflow-hidden">
                {letter.song_album_cover ? (
                  <img
                    src={letter.song_album_cover}
                    alt={letter.song_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    🎵
                  </div>
                )}

                {/* 覆盖层 */}
                <div className="absolute inset-0 bg-base-black/20 group-hover:bg-base-black/10 transition-colors flex items-end p-4">
                  <div className="text-white drop-shadow-md">
                    <p className="font-medium text-sm line-clamp-1">{letter.song_title}</p>
                    <p className="text-xs opacity-90 line-clamp-1">{letter.song_artist}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900 line-clamp-1">To: {letter.recipient_name}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                    {new Date(letter.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 h-10 mb-3">
                  {letter.message}
                </p>

                <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1">
                    <span>👁️ {letter.view_count || 0}</span>
                  </div>
                  {letter.user_id ? (
                    <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Synced</span>
                  ) : (
                    <span className="text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Local</span>
                  )}
                </div>
              </div>
            </Link>
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