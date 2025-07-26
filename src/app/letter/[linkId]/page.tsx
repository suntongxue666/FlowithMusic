'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedSpotifyPlayer from '@/components/EnhancedSpotifyPlayer'
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
          // 1. 先尝试从localStorage获取数据（本地优先）
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          
          if (localLetter) {
            console.log('Found letter in localStorage:', localLetter.link_id)
            setLetter(localLetter)
            setLoading(false) // 立即显示本地数据
          }

          // 2. 然后异步从远程获取最新数据
          const remoteLetter = await letterService.getLetterByLinkId(linkId)
          if (remoteLetter) {
            console.log('Found letter in remote database')  
            setLetter(remoteLetter) // 用远程数据覆盖（如果有的话）
          } else if (!localLetter) {
            // 如果远程和本地都没有，才显示未找到
            setLetter(null)
          }
        } catch (error) {
          console.error('Failed to load letter:', error)
          // 如果远程加载失败，但有本地数据，就保持本地数据
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const localLetter = localLetters.find((l: any) => l.link_id === linkId)
          if (!localLetter) {
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
              <h2>🔍 Letter Not Found</h2>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                We're having trouble loading this letter right now. This might be due to:
              </p>
              <ul style={{ textAlign: 'left', color: '#666', marginBottom: '2rem' }}>
                <li>The link might be incorrect or expired</li>
                <li>We're experiencing temporary technical issues</li>
                <li>The letter might not have been saved properly</li>
              </ul>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                Please ask the sender to check the link or try sending a new message.
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
              Someone picked this song just for you :)
            </p>
          </div>
          
          <div className="letter-player">
            <EnhancedSpotifyPlayer 
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