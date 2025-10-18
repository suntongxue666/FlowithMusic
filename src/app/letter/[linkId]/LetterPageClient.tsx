'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import ColorfulSpotifyPlayer from '@/components/ColorfulSpotifyPlayer'
import LetterInteractions from '@/components/LetterInteractions'
import LetterQRCode from '@/components/LetterQRCode'
import ViewTracker from '@/components/ViewTracker'
import { letterService } from '@/lib/letterService'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import type { Letter } from '@/lib/supabase'

// 动物表情符号数组
const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']

// 浅色背景数组
const LIGHT_COLORS = [
  '#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF5E5', '#F0E5FF', '#E5FFFF',
  '#FFE5F5', '#F5FFE5', '#E5E5FF', '#FFFFE5', '#FFE5CC', '#E5FFCC',
  '#CCE5FF', '#FFCCE5', '#E5CCFF', '#CCFFE5', '#FFCCCC', '#CCFFCC',
  '#CCCCFF', '#FFFFCC', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#FFFFE0'
]

// 生成匿名用户头像和用户名 - 基于统一的匿名ID
function generateAnonymousUser(letter: any) {
  // 优先使用letter的anonymous_id，如果没有则使用linkId（兼容旧数据）
  const seedId = letter.anonymous_id || letter.link_id || 'fallback'
  
  // 使用anonymous_id作为种子来确保同一个匿名用户的所有letter显示相同的头像和用户名
  let hash = 0
  for (let i = 0; i < seedId.length; i++) {
    const char = seedId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const emojiIndex = Math.abs(hash) % ANIMAL_EMOJIS.length
  const colorIndex = Math.abs(hash >> 8) % LIGHT_COLORS.length
  const userNumber = Math.abs(hash >> 16) % 100000000 // 8位数字
  
  return {
    emoji: ANIMAL_EMOJIS[emojiIndex],
    backgroundColor: LIGHT_COLORS[colorIndex],
    username: `Guest${userNumber.toString().padStart(8, '0')}`
  }
}

// Letter发送者组件
function LetterSender({ user, letter }: { user?: any, letter?: any }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
    setShowTooltip(true)
  }
  
  const handleMouseLeave = () => {
    setShowTooltip(false)
  }
  
  if (user) {
    // 已登录用户
    return (
      <div className="letter-sender-section">
        <div 
          className="letter-sender-avatar"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.display_name || 'Sender'} 
              className="sender-avatar-img"
            />
          ) : (
            <div className="sender-avatar-placeholder">
              {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <div className="letter-sender-text">
          From {user.display_name || 'Anonymous'}
        </div>
        
        {/* 用户信息提示框 */}
        {showTooltip && (
          <div 
            className="user-tooltip"
            style={{
              position: 'fixed',
              left: tooltipPosition.x - 150,
              top: tooltipPosition.y - 200,
              zIndex: 1000
            }}
          >
            <div className="tooltip-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} />
              ) : (
                <div className="tooltip-avatar-placeholder">
                  {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="tooltip-info">
              <div className="tooltip-username">{user.display_name || 'Anonymous'}</div>
              {user.social_media_info && (
                <div className="tooltip-social">
                  {user.social_media_info.whatsapp && (
                    <div>📱 WhatsApp: {user.social_media_info.whatsapp}</div>
                  )}
                  {user.social_media_info.instagram && (
                    <div>📷 Instagram: @{user.social_media_info.instagram}</div>
                  )}
                  {user.social_media_info.tiktok && (
                    <div>🎵 TikTok: @{user.social_media_info.tiktok}</div>
                  )}
                  {user.social_media_info.x && (
                    <div>🐦 X: @{user.social_media_info.x}</div>
                  )}
                  {user.social_media_info.facebook && (
                    <div>👥 Facebook: {user.social_media_info.facebook}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  } else {
    // 匿名用户 - 使用letter的anonymous_id生成一致的头像和用户名
    const anonymousUser = generateAnonymousUser(letter)
    
    return (
      <div className="letter-sender-section">
        <div className="letter-sender-avatar">
          <div 
            className="sender-avatar-anonymous"
            style={{ backgroundColor: anonymousUser.backgroundColor }}
          >
            {anonymousUser.emoji}
          </div>
        </div>
        <div className="letter-sender-text">
          From {anonymousUser.username}
        </div>
      </div>
    )
  }
}

interface LetterPageClientProps {
  linkId: string
}

export default function LetterPageClient({ linkId }: LetterPageClientProps) {
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)

  // 检测文本是否包含中文字符
  const hasChinese = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text)
  }

  // 记录浏览
  const recordView = async (linkId: string) => {
    try {
      // 获取用户身份
      const userIdentity = ImprovedUserIdentity.getOrCreateIdentity()
      
      // 设置cookie，以便API可以识别用户
      document.cookie = `anonymous_id=${encodeURIComponent(userIdentity.id)}; path=/; max-age=31536000; SameSite=Lax`
      
      const response = await fetch(`/api/letters/${linkId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log('📊 浏览记录已上报')
      } else {
        console.warn('⚠️ 浏览记录上报失败')
      }
    } catch (error) {
      console.error('💥 浏览记录上报错误:', error)
    }
  }

  useEffect(() => {
    const loadLetter = async () => {
      if (linkId) {
        try {
          console.log('🔍 Loading letter with linkId:', linkId)
          
          let foundLetter: Letter | null = null
          
          // 1. 直接从API获取（最可靠的数据源）
          console.log('🔍 Fetching from API for linkId:', linkId)
          try {
            const apiResponse = await fetch(`/api/letters/${linkId}`)
            if (apiResponse.ok) {
              const apiLetter = await apiResponse.json()
              console.log('✅ Found letter via API:', apiLetter)
              
              // 验证Letter数据完整性
              if (apiLetter && apiLetter.link_id && apiLetter.recipient_name && apiLetter.message) {
                foundLetter = apiLetter
                setLetter(apiLetter)
                setLoading(false)
                console.log('✅ Letter data is complete and valid')
                
                // 记录浏览
                recordView(linkId)
                return
              } else {
                console.warn('⚠️ Letter data incomplete from API:', {
                  hasLinkId: !!apiLetter?.link_id,
                  hasRecipient: !!apiLetter?.recipient_name,
                  hasMessage: !!apiLetter?.message,
                  hasSong: !!apiLetter?.song_title
                })
              }
            } else {
              console.log('❌ API returned error:', apiResponse.status)
              const errorText = await apiResponse.text()
              console.log('Error details:', errorText)
            }
          } catch (apiError) {
            console.error('API fetch error:', apiError)
          }

          // 2. 从数据库获取Letter（通过letterService）
          console.log('🔍 Trying letterService for linkId:', linkId)
          try {
            const databaseLetter = await letterService.getLetterByLinkId(linkId)
            if (databaseLetter && databaseLetter.recipient_name && databaseLetter.message) {
              console.log('✅ Found complete letter in database')
              foundLetter = databaseLetter
              setLetter(databaseLetter)
              setLoading(false)
              
              // 记录浏览
              recordView(linkId)
              return
            } else if (databaseLetter) {
              console.warn('⚠️ Letter found but incomplete in database:', {
                hasRecipient: !!databaseLetter.recipient_name,
                hasMessage: !!databaseLetter.message,
                hasSong: !!databaseLetter.song_title
              })
            }
          } catch (dbError) {
            console.error('Database fetch error:', dbError)
          }

          // 3. 检查localStorage作为最后备用
          console.log('🔍 Checking localStorage as final fallback')
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          if (localLetter && localLetter.recipient_name && localLetter.message) {
            console.log('✅ Found complete letter in localStorage')
            foundLetter = localLetter
            setLetter(localLetter)
            setLoading(false)
            
            // 记录浏览
            recordView(linkId)
            return
          } else if (localLetter) {
            console.warn('⚠️ Letter found but incomplete in localStorage:', {
              hasRecipient: !!localLetter.recipient_name,
              hasMessage: !!localLetter.message,
              hasSong: !!localLetter.song_title
            })
          }

          // 4. 如果都没找到完整的Letter
          console.log('❌ No complete letter found anywhere for linkId:', linkId)
          console.log('Available localStorage letters:', localLetters.map((l: any) => ({
            linkId: l.link_id,
            recipient: l.recipient_name,
            hasMessage: !!l.message,
            created: l.created_at
          })))

          setLetter(null)
        } catch (error) {
          console.error('Failed to load letter:', error)
          setLetter(null)
        }
      }
      setLoading(false)
    }
    
    loadLetter()
  }, [linkId])

  if (loading) {
    return (
      <main>
        <Header />
        <div className="letter-container">
          <div className="loading">Loading...</div>
        </div>
      </main>
    )
  }

  if (!letter) {
    return (
      <main>
        <Header />
        <div className="letter-container">
          <div className="letter-content">
            <div className="letter-header">
              <h2 className="handwritten-greeting">🔍 Hmm, we can't find this letter...</h2>
              <p className="message-content handwritten" style={{ color: '#666', marginBottom: '2rem', fontSize: '1.2rem' }}>
                Something's not quite right here. This could be because:
              </p>
              <div className="message-content handwritten" style={{ textAlign: 'left', color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
                <p>• Maybe the link got a little mixed up?</p>
                <p>• We might be having some behind-the-scenes hiccups</p>
                <p>• The letter might have gotten lost in the digital mail</p>
              </div>
              <p className="message-content handwritten" style={{ color: '#666', marginBottom: '2rem', fontSize: '1.2rem' }}>
                Could you ask your friend to double-check the link? Or maybe they could send you a fresh one?
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/send" className="send-button black-button">
                  💌 Send a New Message
                </a>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  🔄 Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <Header />
      {/* 浏览追踪组件 */}
      <ViewTracker letterId={linkId} />
      <div className="letter-container">
        <div className="letter-content">
          <div className="letter-header">
            <h2 className="handwritten-greeting">Hello, {letter.recipient_name}</h2>
            <p className="letter-subtitle" style={{ fontSize: '12px' }}>
              A handwritten letter just for you — with a handpicked song and private words.
            </p>
          </div>
          
          <div className="letter-player">
            {letter.song_title && letter.song_artist ? (
              <ColorfulSpotifyPlayer 
                track={{
                  id: letter.song_id,
                  name: letter.song_title,
                  artists: [{ name: letter.song_artist }],
                  album: {
                    name: letter.song_title,
                    images: [{ url: letter.song_album_cover }]
                  },
                  preview_url: letter.song_preview_url || null,
                  external_urls: {
                    spotify: letter.song_spotify_url
                  }
                }}
              />
            ) : (
              <div style={{ 
                background: '#f8f9fa', 
                padding: '2rem', 
                borderRadius: '12px', 
                textAlign: 'center',
                border: '2px dashed #dee2e6' 
              }}>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  🎵 Song information is missing or unavailable
                </p>
                <small style={{ color: '#adb5bd' }}>
                  Song: {letter.song_title || 'Not found'} | Artist: {letter.song_artist || 'Not found'}
                </small>
              </div>
            )}
          </div>
          
          <div className="letter-message" style={{ marginTop: '-16px' }}>
            {letter.message ? (
              <div className={`message-content handwritten large-text ${hasChinese(letter.message) ? 'chinese-text' : ''}`}>
                {letter.message}
              </div>
            ) : (
              <div style={{ 
                background: '#f8f9fa', 
                padding: '2rem', 
                borderRadius: '12px', 
                textAlign: 'center',
                border: '2px dashed #dee2e6' 
              }}>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  💬 Message content is missing or unavailable
                </p>
              </div>
            )}
            
            {/* 发送者信息 - 单独一行显示 */}
            <LetterSender user={letter.user} letter={letter} />
            
            <div className="letter-date centered-date" style={{ fontSize: '12px' }}>
              Sent on {new Date(letter.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </div>
          </div>

          <LetterInteractions letterId={letter.link_id} />
          
          <div className="letter-footer" style={{ marginTop: '4px' }}>
            <p>Want to send a song to a friend?</p>
            <a href="/send" className="send-button black-button">
              💌 Send a song
            </a>
          </div>
        </div>
        
        <div className="spotify-prompt desktop-only">
          <img 
            src="https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png" 
            alt="Spotify" 
            width={16} 
            height={16}
          />
          <span>  Log in to Spotify in your browser to listen to the full song.</span>
        </div>
        
        <LetterQRCode />
      </div>
    </main>
  )
}