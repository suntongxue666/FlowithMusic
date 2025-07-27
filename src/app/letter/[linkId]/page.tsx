'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import ColorfulSpotifyPlayer from '@/components/ColorfulSpotifyPlayer'
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
          
          // 1. 快速检查localStorage（本地数据） - 立即显示
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          if (localLetter) {
            console.log('✅ Found letter in localStorage')
            foundLetter = localLetter
            setLetter(localLetter)
            setLoading(false)
            // 仍然继续从数据库加载，以确保数据是最新的
          }

          // 2. 从数据库获取Letter（主要数据源）
          console.log('🔍 Searching in database for linkId:', linkId)
          const databaseLetter = await letterService.getLetterByLinkId(linkId)
          if (databaseLetter) {
            console.log('✅ Found letter in database')
            foundLetter = databaseLetter
            setLetter(databaseLetter)
            setLoading(false)
            return
          }

          // 3. 尝试从API直接获取（包括共享存储）
          console.log('🔍 Trying direct API fetch for linkId:', linkId)
          try {
            const apiResponse = await fetch(`/api/letters/${linkId}`)
            if (apiResponse.ok) {
              const apiLetter = await apiResponse.json()
              console.log('✅ Found letter via direct API')
              foundLetter = apiLetter
              setLetter(apiLetter)
              setLoading(false)
              return
            } else {
              console.log('❌ API returned:', apiResponse.status, await apiResponse.text())
            }
          } catch (apiError) {
            console.error('API fetch error:', apiError)
          }

          // 4. 如果之前找到了本地Letter，继续使用它
          if (foundLetter) {
            console.log('✅ Using previously found letter as final result')
            setLetter(foundLetter)
            setLoading(false)
            return
          }

          // 5. 最终检查：尝试从所有用户的localStorage检查（调试用）
          console.log('🔍 Final check: letter not found anywhere')
          console.log('Available localStorage letters:', localLetters.map((l: any) => ({
            linkId: l.link_id,
            recipient: l.recipient_name,
            created: l.created_at
          })))

          // 6. 如果都没找到，显示未找到
          console.log('❌ Letter not found anywhere:', linkId)
          setLetter(null)
        } catch (error) {
          console.error('Failed to load letter:', error)
          
          // 在出错时，尝试从本地获取
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          if (localLetter) {
            console.log('✅ Using local letter after error')
            setLetter(localLetter)
          } else {
            setLetter(null)
          }
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
            <p className="letter-subtitle">
              Someone picked the song just for you :)
            </p>
          </div>
          
          <div className="letter-player">
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
          </div>
          
          <div className="letter-message">
            <h3 className="message-title">A few words the sender wanted only you to see:</h3>
            <div className={`message-content handwritten large-text ${hasChinese(letter.message) ? 'chinese-text' : ''}`}>
              {letter.message}
            </div>
            <div className="letter-date centered-date">
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
          
          <div className="letter-footer">
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
          <span>Log in to Spotify in your browser to listen to the full song.</span>
        </div>
      </div>
    </main>
  )
}