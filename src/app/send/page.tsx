'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import SongSelector from '@/components/SongSelector'
import SpotifyEmbedPlayer from '@/components/SpotifyEmbedPlayer'
import Toast from '@/components/Toast'
import { SpotifyTrack } from '@/lib/spotify'
import { letterService } from '@/lib/letterService'

export default function SendPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [createdLetter, setCreatedLetter] = useState<any>(null)

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
  }

  const handleSubmit = async () => {
    if (!selectedTrack || !recipient.trim() || !message.trim()) return

    // 检查消息是否超过12个单词
    const wordCount = message.trim().split(/\s+/).length
    if (wordCount < 12) {
      alert('Message must be at least 12 words long to be shared publicly.')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Save to Supabase using letterService
      const newLetter = await letterService.createLetter({
        to: recipient.trim(),
        message: message.trim(),
        song: {
          id: selectedTrack.id,
          title: selectedTrack.name,
          artist: selectedTrack.artists[0]?.name || 'Unknown Artist',
          albumCover: selectedTrack.album.images[0]?.url || '',
          previewUrl: selectedTrack.preview_url || undefined,
          spotifyUrl: selectedTrack.external_urls.spotify
        }
      })

      setCreatedLetter(newLetter)

      // Show toast
      setShowToast(true)

      // Wait for toast to show, then redirect
      setTimeout(() => {
        router.push('/history')
      }, 2500) // Wait a bit longer than toast duration

    } catch (error) {
      console.error('Failed to submit:', error)
      alert('Failed to create letter. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  // Check if all fields are filled
  const isFormComplete = recipient.trim() && message.trim() && selectedTrack

  return (
    <main>
      <Header currentPage="send" />
      <div className="send-container">
        <div className="send-form">
          <div className="form-section">
            <label htmlFor="recipient">Recipient</label>
            <input 
              type="text" 
              id="recipient"
              placeholder="Enter recipient's name"
              className="form-input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="form-section">
            <label htmlFor="message">Message</label>
            <textarea 
              id="message"
              placeholder="Write your message here"
              className="form-textarea"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="form-section">
            <label htmlFor="song">Song</label>
            <SongSelector 
              onSelect={handleTrackSelect}
              selectedTrack={selectedTrack}
            />
          </div>

          {selectedTrack && (
            <div className="form-section">
              <SpotifyEmbedPlayer track={selectedTrack} />
            </div>
          )}

          <button 
            className={`submit-btn ${isFormComplete ? 'complete' : ''}`}
            disabled={!isFormComplete || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Sending...' : 'Submit'}
          </button>
        </div>
      </div>

      <Toast 
        message="Link with 💌 is ready!\nPaste it in a text, WhatsApp, or IG Story — or open it to share the image and @yourfriend 🎶"
        isVisible={showToast}
        onClose={handleToastClose}
        duration={2000}
      />
    </main>
  )
}