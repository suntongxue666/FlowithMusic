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

  useEffect(() => {
    const loadLetter = async () => {
      if (typeof linkId === 'string') {
        try {
          console.log('Loading letter with linkId:', linkId)
          
          // 1. 优先检查URL参数中的Letter数据（最快）
          const urlParams = new URLSearchParams(window.location.search)
          const letterDataParam = urlParams.get('data')
          if (letterDataParam) {
            try {
              const letterData = JSON.parse(decodeURIComponent(letterDataParam))
              console.log('✅ Found letter data in URL parameters')
              setLetter(letterData)
              setLoading(false)
              return
            } catch (parseError) {
              console.error('Failed to parse letter data from URL:', parseError)
            }
          }

          // 2. 快速检查localStorage（本地数据）
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          if (localLetter) {
            console.log('✅ Found letter in localStorage')
            setLetter(localLetter)
            setLoading(false)
            return
          }

          // 3. 从数据库获取Letter（最重要的步骤）
          console.log('🔍 Searching in database for linkId:', linkId)
          const databaseLetter = await letterService.getLetterByLinkId(linkId)
          if (databaseLetter) {
            console.log('✅ Found letter in database')
            setLetter(databaseLetter)
            setLoading(false)
            return
          }

          // 4. 如果都没找到，显示未找到
          console.log('❌ Letter not found anywhere:', linkId)
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
            <div className="message-content handwritten large-text">
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
      </div>
    </main>
  )
}