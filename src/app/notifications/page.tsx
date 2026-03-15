'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useUserState } from '@/hooks/useUserState'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'
import PremiumLimitModal from '@/components/PremiumLimitModal'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: globalLoading } = useUserState()
  
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  useEffect(() => {
    async function loadNotifications() {
      const queryId = user?.id || (typeof window !== 'undefined' ? userService.getAnonymousId() : null);
      if (!queryId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const res = await fetch(`/api/notifications?userId=${queryId}`)
        const data = await res.json()
        let fetchedNotifs = data.notifications || []

        if (fetchedNotifs.length === 0) {
          fetchedNotifs = [
            {
              id: 'test-1',
              is_read: false,
              type: 'interaction',
              actor_id: 'test-user-sunwei',
              actor_name: 'Sunwei7482',
              actor_avatar: '',
              letter_id: 'sample-1',
              created_at: new Date().toISOString(),
              metadata: { emoji: '🫶', label: 'Hug' }
            },
            {
              id: 'test-2',
              is_read: false,
              type: 'profile_visit',
              actor_id: 'anonymous-test',
              actor_name: 'Anonymous',
              actor_avatar: '',
              letter_id: 'sample-2',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              metadata: {}
            }
          ]
        }
        
        setNotifications(fetchedNotifs)
        
        // Mark all as read after a short delay
        setTimeout(async () => {
          await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: queryId, markAll: true })
          })
          
          // Emit a local event to update badge in Header
          window.dispatchEvent(new Event('notificationsRead'))
        }, 1000)
        
      } catch (err) {
        console.error('Failed to load notifications', err)
      } finally {
        setLoading(false)
      }
    }

    if (!globalLoading) {
      loadNotifications()
    }
  }, [user, globalLoading])

  if (globalLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <Header currentPage="notifications" />
      <div className="flex flex-col items-center py-8 sm:py-16">
        <div className="w-full max-w-2xl px-4">
          
          {/* 顶部标题栏 - 参考History页面 */}
          <div className="mb-10 flex items-center justify-center gap-4" style={{ marginTop: '24px', marginBottom: '40px' }}>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Notifications
            </h1>
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
          
          {notifications.length === 0 ? (
            <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-16">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No new notifications</h3>
              <p className="text-sm text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => {
                const isUnread = !notif.is_read
                const isVisit = notif.type === 'profile_visit'
                const isLoginUser = notif.actor_name !== 'Anonymous'
                
                const isPremium = user?.is_premium || false
                const isLocked = !isPremium && (notif.type === 'profile_visit' || notif.type === 'interaction')

                return (
                  <div 
                    key={notif.id} 
                    className={`bg-white rounded-xl shadow-sm border flex items-center transition-colors mx-2 sm:mx-0 ${
                      isUnread ? 'border-sky-100 bg-sky-50/50' : 'border-gray-100'
                    } ${isLocked ? 'relative overflow-hidden' : ''}`}
                    style={{ padding: '12px', gap: '12px' }}
                  >
                    <div className="flex-shrink-0">
                      <Link href={isLocked ? '#' : `/user/${notif.actor_id}`} onClick={(e) => isLocked && e.preventDefault()}>
                        <div className={`w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center transition-all ${isLocked ? 'blur-xl' : 'hover:scale-105'}`}>
                          {notif.actor_avatar && !isLocked ? (
                            <img src={notif.actor_avatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold">
                              {isLocked ? '?' : (notif.actor_name?.charAt(0) || 'U')}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-base text-gray-900 leading-relaxed">
                        <span className={`font-semibold transition-all ${isLoginUser ? 'text-blue-500' : 'text-gray-900'} ${isLocked ? 'blur-md select-none' : ''}`}>
                          {notif.actor_name}
                        </span>{' '}
                        {isVisit ? (
                          <span className="text-gray-600">visited your profile.</span>
                        ) : (
                          <span className="text-gray-600">
                            reacted with <span className={`text-lg transition-all ${isLocked ? 'blur-md' : ''}`}>{notif.metadata?.emoji}</span> to your letter.
                          </span>
                        )}
                      </p>
                      
                      {notif.letter_id && (
                        <div className="mt-3">
                          <span className="text-xs text-blue-400 inline-flex items-center gap-1">
                            {isLocked ? 'Letter link locked' : 'View Letter'}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>

                    {isLocked && (
                      <button 
                        onClick={() => setShowPremiumModal(true)}
                        className="ml-auto bg-black text-white text-[13px] font-bold py-2.5 px-5 rounded-full flex items-center gap-1.5 hover:scale-105 transition-all shadow-lg active:scale-95 flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Unlock with 👑 Premium
                      </button>
                    )}
                    
                    {isUnread && !isLocked && (
                      <div className="ml-auto flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {showPremiumModal && (
        <PremiumLimitModal 
          onClose={() => setShowPremiumModal(false)} 
          type="notif_lock" 
        />
      )}

      {/* 底部装饰 */}
      <div className="mt-20 py-10 text-center opacity-10">
        <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.6em]">Flowith Music</p>
      </div>
    </main>
  )
}
