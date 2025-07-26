'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import SongSelector from '@/components/SongSelector'
import SpotifyEmbedPlayer from '@/components/SpotifyEmbedPlayer'
import Toast from '@/components/Toast'
import { SpotifyTrack } from '@/lib/spotify'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'

export default function SendPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdLetter, setCreatedLetter] = useState<any>(null)
  const [userInitialized, setUserInitialized] = useState(false)

  // 初始化用户
  useEffect(() => {
    const initUser = async () => {
      try {
        const anonymousId = await userService.initializeUser()
        console.log('User initialized with ID:', anonymousId)
        setUserInitialized(true)
      } catch (error) {
        console.error('Failed to initialize user:', error)
        setErrorMessage('Failed to initialize user session. Please refresh the page.')
        setShowErrorModal(true)
      }
    }
    
    initUser()
  }, [])

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track)
  }

  const handleSubmit = async () => {
    if (!selectedTrack || !recipient.trim() || !message.trim() || !userInitialized) return

    setIsSubmitting(true)
    
    try {
      // 确保用户已初始化
      const currentUser = userService.getCurrentUser()
      const anonymousId = userService.getAnonymousId()
      
      console.log('Creating letter with user info:', {
        currentUser: currentUser?.id,
        anonymousId,
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

      console.log('Letter created successfully:', newLetter)
      setCreatedLetter(newLetter)

      // Show toast
      setShowToast(true)

      // 等待一下确保数据已经保存，然后跳转
      setTimeout(() => {
        router.push('/history')
      }, 1000)

    } catch (error) {
      console.error('Failed to submit:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to create letter. Please try again.'
      setErrorMessage(`⚠️ ${errorMsg}`)
      setShowErrorModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const handleErrorModalClose = () => {
    setShowErrorModal(false)
    setErrorMessage('')
  }

  // Check if all fields are filled and user is initialized
  const isFormComplete = recipient.trim() && message.trim() && selectedTrack && userInitialized

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

      {/* Error Modal */}
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={handleErrorModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-content">
              <div className="error-icon">⚠️</div>
              <h3>Error</h3>
              <p>{errorMessage}</p>
              <button 
                className="error-modal-btn"
                onClick={handleErrorModalClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}