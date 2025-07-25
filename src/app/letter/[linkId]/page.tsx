'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import EnhancedSpotifyPlayer from '@/components/EnhancedSpotifyPlayer'
import { letterStorage } from '@/lib/letterStorage'
import type { MusicLetter } from '@/lib/letterStorage'

export default function LetterPage() {
  const { linkId } = useParams()
  const [letter, setLetter] = useState<MusicLetter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLetter = async () => {
      if (typeof linkId === 'string') {
        const foundLetter = letterStorage.getLetterByLinkId(linkId)
        setLetter(foundLetter)
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
          <div className="error">Letter not found</div>
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
            <h2 className="handwritten-greeting">Hello, {letter.to}</h2>
            <p className="letter-subtitle">
              Someone picked this song just for you :)
            </p>
          </div>
          
          <div className="letter-player">
            <EnhancedSpotifyPlayer 
              track={{
                id: letter.song.id,
                name: letter.song.title,
                artists: [{ name: letter.song.artist }],
                album: {
                  name: letter.song.title,
                  images: [{ url: letter.song.albumCover }]
                },
                preview_url: letter.song.previewUrl || null,
                external_urls: {
                  spotify: letter.song.spotifyUrl
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
              Sent on {letter.createdAt.toLocaleDateString('en-US', {
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