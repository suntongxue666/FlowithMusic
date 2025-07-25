'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import CompetitorStylePlayer from '@/components/CompetitorStylePlayer'
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
            <h2>Hello, {letter.to}</h2>
            <p className="letter-subtitle">
              There's someone sending you a song, they want you to hear this song that maybe you'll like :)
            </p>
          </div>
          
          <div className="letter-player">
            <CompetitorStylePlayer 
              track={{
                id: letter.song.id,
                name: letter.song.title,
                artists: [{ name: letter.song.artist }],
                album: {
                  name: letter.song.title,
                  images: [{ url: letter.song.albumCover }]
                },
                preview_url: letter.song.previewUrl,
                external_urls: {
                  spotify: letter.song.spotifyUrl
                }
              }}
            />
          </div>
          
          <div className="letter-message">
            <h3>Also, here's a message from the sender:</h3>
            <div className="message-content">
              {letter.message}
            </div>
            <div className="letter-date">
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
            <a href="/send" className="send-button">
              Send a song
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}