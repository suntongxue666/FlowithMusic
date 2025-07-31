'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import ColorfulSpotifyPlayer from '@/components/ColorfulSpotifyPlayer'
import LetterInteractions from '@/components/LetterInteractions'
import { letterService } from '@/lib/letterService'
import type { Letter } from '@/lib/supabase'

export default function LetterPage() {
  const { linkId } = useParams()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)

  // 检测文本是否包含中文字符
  const hasChinese = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text)
  }

  useEffect(() => {
    const loadLetter = async () => {
      if (typeof linkId === 'string') {
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
      <div className="letter-container">
        <div className="letter-content">
          <div className="letter-header">
            <h2 className="handwritten-greeting">Hello, {letter.recipient_name}</h2>
            <p className="letter-subtitle" style={{ fontSize: '12px' }}>
              A handwritten letter just for you — with a handpicked song and private words.
            </p>
          </div>
          
          {/* Debug information */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ background: '#f0f0f0', padding: '1rem', margin: '1rem 0', fontSize: '12px' }}>
              <strong>Debug Info:</strong><br/>
              Link ID: {letter.link_id}<br/>
              Recipient: {letter.recipient_name}<br/>
              Message: {letter.message ? `"${letter.message.substring(0, 50)}..."` : 'MISSING'}<br/>
              Song ID: {letter.song_id || 'MISSING'}<br/>
              Song Title: {letter.song_title || 'MISSING'}<br/>
              Song Artist: {letter.song_artist || 'MISSING'}<br/>
              Album Cover: {letter.song_album_cover ? 'Present' : 'MISSING'}<br/>
              Created: {letter.created_at}
            </div>
          )}
          
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
      </div>
    </main>
  )
}