'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import MusicCard from '@/components/MusicCard'
import ColorfulSpotifyPlayer from '@/components/ColorfulSpotifyPlayer'
import LetterInteractions from '@/components/LetterInteractions'
import LetterQRCode from '@/components/LetterQRCode'
import ViewTracker from '@/components/ViewTracker'
import { letterService } from '@/lib/letterService'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import FlowingEffects from '@/components/FlowingEffects'
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
  const [letterCount, setLetterCount] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id && showTooltip && letterCount === null) {
      const fetchCount = async () => {
        try {
          const res = await fetch(`/api/letters?userId=${user.id}&countOnly=true`)
          const data = await res.json()
          if (data.count !== undefined) {
            setLetterCount(data.count)
          }
        } catch (e) {
          console.error('Failed to fetch user letter count', e)
        }
      }
      fetchCount()
    }
  }, [user?.id, showTooltip, letterCount])

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
        <Link href={`/user/${user.id}`} className="flex items-center gap-3 no-underline">
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
          <div className="letter-sender-text hover:underline" style={{ color: '#3b82f6', fontWeight: 600 }}>
            From {user.display_name || 'Anonymous'}
          </div>
        </Link>

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
              <div className="tooltip-letters-count" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Letters: {letterCount !== null ? letterCount : '...'}
              </div>
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
  const searchParams = useSearchParams()
  const emojiParam = searchParams.get('emoji') // 检查URL参数 ?emoji=flowing

  const [letter, setLetter] = useState<Letter | null>(null)
  const [forceRefresh, setForceRefresh] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [showEffect, setShowEffect] = useState(false)
  const [effectMode, setEffectMode] = useState<'preview' | 'full'>('preview')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [relatedBySong, setRelatedBySong] = useState<Letter[]>([])
  const [relatedByCategory, setRelatedByCategory] = useState<Letter[]>([])
  const [artistFans, setArtistFans] = useState<Array<{ id: string; firstName: string; avatarUrl: string | null }>>([]
  )

  // 检测文本是否包含中文字符
  const hasChinese = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text)
  }

  // 检测文本是否包含Emoji表情 (charCode方式避免TS target限制)
  const hasEmoji = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code >= 0xD800 && code <= 0xDBFF) return true // surrogate pair (most emoji)
      if (code >= 0x2600 && code <= 0x27BF) return true // misc symbols
    }
    return false
  }

  // 如果URL参数带有emoji=flowing，在Letter加载完成后检查并开启效果
  useEffect(() => {
    console.log('🔍 URL参数检查:', { emojiParam, linkId, hasLetter: !!letter })
    console.log('🔍 Letter数据:', letter)
    console.log('🔍 animation_config:', letter?.animation_config)
    console.log('🔍 emojis:', letter?.animation_config?.emojis)

    if (emojiParam === 'flowing' && letter?.animation_config?.emojis) {
      console.log('🎯 触发Flowing Emoji效果!')
      console.log('🔍 Emoji=flowing 检查（Letter加载后）:', { linkId, hasLetter: !!letter, hasAnimationConfig: !!letter?.animation_config, emojis: letter?.animation_config?.emojis })
      setEffectMode('full')
      setShowEffect(true)
      console.log('✅ Flowing Emoji 效果已开启（Letter加载后）')
      console.log('✅ 状态已更新:', { showEffect: true, effectMode: 'full' })
    } else {
      console.warn('⚠️ 未触发Flowing Emoji:', { emojiParam, hasLetter: !!letter, hasAnimationConfig: !!letter?.animation_config, hasEmojis: !!letter?.animation_config?.emojis })
    }
  }, [emojiParam, letter])

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
              console.log('🔍 API Letter 详细数据:', {
                link_id: apiLetter.link_id,
                hasAnimationConfig: !!apiLetter.animation_config,
                animationConfig: apiLetter.animation_config,
                effect_type: apiLetter.effect_type,
                hasEmojis: !!apiLetter.animation_config?.emojis,
                emojis: apiLetter.animation_config?.emojis
              })

              // 验证Letter数据完整性
              if (apiLetter && apiLetter.link_id && apiLetter.recipient_name && apiLetter.message) {
                foundLetter = apiLetter

                // 检查 URL 参数是否为 emoji=flowing，如果是则从 localStorage 获取 animation_config
                if (emojiParam === 'flowing') {
                  console.log('🔍 检测到 emoji=flowing，从 localStorage 获取 animation_config')
                  const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
                  const localLetter = localLetters.find((l: any) => l.link_id === linkId)
                  console.log('🔍 localStorage 中找到的 Letter:', localLetter)

                  if (localLetter?.animation_config?.emojis) {
                    console.log('✅ 从 localStorage 获取到 animation_config:', localLetter.animation_config)
                    // 合并 localStorage 的 animation_config 到 API 返回的 letter
                    apiLetter.animation_config = localLetter.animation_config
                  }
                }

                // If apiLetter has countryCode, we can store it or use it
                setLetter(apiLetter)

                // Check for paid effect
                if (apiLetter.effect_type) {
                  setEffectMode('full')
                  setShowEffect(true)
                }

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
            const databaseLetter = await letterService.getLetter(linkId)
            if (databaseLetter && databaseLetter.recipient_name && databaseLetter.message) {
              console.log('✅ Found complete letter in database')
              foundLetter = databaseLetter
              setLetter(databaseLetter)

              // Check for paid effect
              if (databaseLetter.effect_type) {
                setEffectMode('full')
                setShowEffect(true)
              }

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

  // 加载相关联的信件
  useEffect(() => {
    const loadRelated = async () => {
      if (letter) {
        // 1. 获取同名歌曲的信件
        const bySong = await letterService.getLettersBySong(letter.song_title || '', 6, letter.link_id)
        setRelatedBySong(bySong)

        // 2. 获取同分类的信件
        if (letter.category) {
          const byCategory = await letterService.getLettersByCategory(letter.category, 6, letter.link_id)
          setRelatedByCategory(byCategory)
        }
      }
    }
    loadRelated()
  }, [letter])

  // 加载同艺术家粉丝
  useEffect(() => {
    const loadArtistFans = async () => {
      if (!letter?.song_artist) return
      try {
        const excludeParam = letter.user_id ? `&excludeUserId=${letter.user_id}` : ''
        const res = await fetch(`/api/artist-fans?artist=${encodeURIComponent(letter.song_artist)}${excludeParam}`)
        if (res.ok) {
          const json = await res.json()
          setArtistFans(json.fans || [])
        }
      } catch (e) {
        console.error('Failed to load artist fans', e)
      }
    }
    loadArtistFans()
  }, [letter])

  // 转换函数
  const convertLetterToCard = (l: Letter) => ({
    to: l.recipient_name || 'Someone',
    message: l.message || '',
    song: {
      title: l.song_title || 'Unknown Title',
      artist: l.song_artist || 'Unknown Artist',
      albumCover: l.song_album_cover || '/favicon.ico'
    },
    linkId: l.link_id
  })

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
                  },
                  duration_ms: (letter as any).song_duration_ms
                }}
                countryCode={(letter as any).countryCode}
                forceRefresh={forceRefresh}
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

          <div className="letter-message">
            {letter.message ? (
              <div
                className={`message-content handwritten large-text ${hasChinese(letter.message) ? 'chinese-text' : ''}`}
                style={hasEmoji((letter.recipient_name || '') + (letter.message || '')) ? { fontSize: 'calc(2.4rem - 2px)' } : {}}
              >
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

            {/* 已解锁显示复制链接 (模拟逻辑，实际可能是分享功能增强) */}
            {letter.effect_type && (
              <div className="effect-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    alert('Link copied! Share this premium letter with friends.')
                  }}
                  className="action-btn copy-btn"
                >
                  🔗 Copy Gold Link
                </button>
              </div>
            )}

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

          {/* Who also like the Artist — inside the footer divider */}
          <div className="letter-footer" style={{ marginTop: '4px' }}>
            {artistFans.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#666', marginBottom: '12px' }}>
                  Who also like &ldquo;{letter.song_artist}&rdquo;
                </p>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  paddingLeft: '12px',
                }}>
                  {artistFans.map(fan => (
                    <a
                      key={fan.id}
                      href={`/user/${fan.id}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: '6px', textDecoration: 'none', flexShrink: 0,
                      }}
                    >
                      {fan.avatarUrl ? (
                        <img
                          src={fan.avatarUrl}
                          alt={fan.firstName}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f0f0f0' }}
                        />
                      ) : (
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '18px',
                        }}>
                          {fan.firstName[0]?.toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: '11px', color: '#555', maxWidth: '52px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fan.firstName}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p>Want to send a song to a friend?</p>
            <a href="/send" className="send-button black-button">
              💌 Send a song
            </a>
          </div>
        </div>

        <div className="spotify-prompt desktop-only" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <img
            src="https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png"
            alt="Spotify"
            width={16}
            height={16}
          />
          <span>Log in to Spotify in your browser to listen to the full song.</span>
        </div>

        <LetterQRCode />

        {/* 相关信件区块 */}
          <div className="related-letters-container" style={{ marginTop: '60px', padding: '0 0.5rem 40px' }}>
            {relatedBySong.length > 0 && (
              <div className="related-section" style={{ marginBottom: '40px' }}>
                <h3 className="related-section-title" style={{ marginBottom: '20px', fontSize: '1.5rem' }}>More Letters with "{letter.song_title}"</h3>
                <div className="cards-grid" style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px'
                }}>
                  {relatedBySong.map((l, i) => {
                    const card = convertLetterToCard(l)
                    return (
                      <div key={l.link_id || i} className="card-wrapper">
                        <MusicCard {...card} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {relatedByCategory.length > 0 && (
              <div className="related-section">
                <h3 className="related-section-title" style={{ marginBottom: '20px', fontSize: '1.5rem' }}>More Letters about "{letter.category}"</h3>
                <div className="cards-grid" style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px'
                }}>
                  {relatedByCategory.map((l, i) => {
                    const card = convertLetterToCard(l)
                    return (
                      <div key={l.link_id || i} className="card-wrapper">
                        <MusicCard {...card} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        {/* 特效层 */}
        {showEffect && letter?.animation_config?.emojis && (
          <FlowingEffects
            emojis={letter.animation_config.emojis}
            mode={effectMode}
          />
        )}

        {/* 支付弹窗 */}
        {showPaymentModal && (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
              <h3>Unlock Flowing Emojis 👑</h3>
              <p>Get the full-screen animation permanently for this letter.</p>
              <div className="paypal-container">
                <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test" }}>
                  <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [{
                          description: `Flowing Emoji for Letter to ${letter?.recipient_name || 'friend'}`,
                          amount: {
                            currency_code: "USD",
                            value: "0.99" // TODO: Set real price
                          }
                        }]
                      })
                    }}
                    onApprove={async (data, actions) => {
                      if (!actions.order) return Promise.reject("Order not found");
                      return actions.order.capture().then(async (details) => {
                        console.log('Transaction completed by ' + details?.payer?.name?.given_name);
                        // Update database
                        await letterService.updateLetterPaymentStatus(linkId, 'flowing_emoji')
                        // Update local state
                        setLetter(prev => prev ? ({ ...prev, effect_type: 'flowing_emoji' }) : null)
                        setEffectMode('full')
                        setShowEffect(true)
                        setShowPaymentModal(false)
                      });
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .action-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: transform 0.2s;
        }
        .action-btn:hover {
          transform: scale(1.05);
        }
        .preview-btn {
          background: #f0f0f0;
          color: #333;
        }
        .unlock-btn {
          background: linear-gradient(45deg, #FFD700, #FFA500);
          color: white;
          box-shadow: 0 4px 10px rgba(255, 165, 0, 0.3);
        }
        .copy-btn {
          background: linear-gradient(45deg, #FFD700, #DAA520);
          color: white;
          width: 100%;
        }
        .payment-modal {
          padding: 30px;
        }
        .payment-modal h3 {
          margin-bottom: 10px;
        }
        .paypal-container {
          margin-top: 20px;
          min-height: 150px;
        }
      `}</style>
    </main>
  )
}