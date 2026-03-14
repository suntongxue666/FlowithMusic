'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { useUserState } from '@/hooks/useUserState'
import { Letter } from '@/lib/supabase'

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React 19 use hook to unwrap params
  const { id: queryId } = use(params)
  
  const { user, isAuthenticated, isLoading: globalLoading } = useUserState()
  
  const [targetUser, setTargetUser] = useState<any>(null)
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const isSelf = isAuthenticated && user && user.id === queryId

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Fetch target user info
        const userInfo = await letterService.getUserById(queryId)
        if (userInfo) {
          setTargetUser(userInfo)
        }
        
        // Fetch their letters
        // User profile only shows public letters if it's not the user themselves
        // Since get user letters returns all, we filter them below if needed
        const fetchedLetters = await letterService.getUserLetters(queryId)
        
        let displayLetters = fetchedLetters
        if (!isSelf) {
          // If not self, only show public letters
          displayLetters = fetchedLetters.filter(l => l.is_public)
        }
        setLetters(displayLetters)

      } catch (err) {
        console.error('Failed to load profile data', err)
      } finally {
        setLoading(false)
      }
    }
    
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

  if (loading) {
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
    <div className="min-h-screen flex flex-col items-center py-8 sm:py-16" style={{ backgroundColor: '#fafafa' }}>
      
      {/* --- Profile Header (Dark Themed) --- */}
      <div className="w-full max-w-2xl px-4">
        <div className="bg-[#1a1a1a] rounded-2xl shadow-lg p-8 mb-10 mt-6 flex flex-col items-center text-white relative">
          
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-white/20 flex items-center justify-center bg-gray-800">
            {targetUser.avatar_url ? (
              <img src={targetUser.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2] w-full h-full flex items-center justify-center text-white">
                {targetUser.display_name?.charAt(0) || targetUser.email?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          
          {/* Info */}
          <h1 className="text-2xl font-bold mb-1">{targetUser.display_name || 'User'}</h1>
          
          {isSelf && (
            <>
              <p className="text-sm text-white/60 mb-1">{targetUser.email}</p>
              <p className="text-sm font-medium text-white/50 mb-6 bg-white/10 px-3 py-1 rounded-full">
                积分 / Points: <span className="text-white font-bold">{targetUser.coins || 0}</span>
              </p>
              
              <button 
                onClick={handleSignOut}
                className="mt-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- Letters List --- */}
      <div className="w-full max-w-2xl px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6 px-2">
          {isSelf ? 'My Letters' : `${targetUser.display_name}'s Letters`}
        </h2>
        
        {letters.length === 0 ? (
          <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-16">
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
          <div className="space-y-4">
            {letters.map((letter) => {
              const hasEmojis = letter.animation_config?.emojis && letter.animation_config.emojis.length > 0;
              const isUnlocked = letter.effect_type === 'flowing_emoji';
              
              return (
                <div key={letter.link_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-row items-center gap-4">
                  {/* Cover */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img src={letter.song_album_cover} alt={letter.song_title} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-900 truncate">
                      To: {letter.recipient_name}
                    </div>
                    <div className="text-sm text-gray-500 truncate mt-1">
                      {letter.song_title} - {letter.song_artist}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(letter.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/letter/${letter.link_id}`}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleCopyLink(letter.link_id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors"
                      style={{ 
                        background: copyStatus === letter.link_id ? '#22c55e' : (isUnlocked ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#1a1a1a'),
                        boxShadow: isUnlocked && copyStatus !== letter.link_id ? '0 2px 8px rgba(255,165,0,0.3)' : 'none'
                      }}
                    >
                      {copyStatus === letter.link_id ? 'Copied' : (isUnlocked ? 'Copy ✨' : 'Copy')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 底部装饰 */}
      <div className="mt-20 py-10 text-center opacity-10">
        <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.6em]">Flowith Music</p>
      </div>

      <style jsx global>{`
        body {
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  )
}
