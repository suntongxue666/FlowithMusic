'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { socialMediaService, SocialMediaData } from '@/lib/socialMediaService'
import { userService } from '@/lib/userService'

export default function TestSocialMediaPage() {
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await userService.getCurrentUser()
        if (user) {
          setIsLoggedIn(true)
          setCurrentUserId(user.id)
          
          // 加载现有的社交媒体数据
          const data = await socialMediaService.getUserSocialMediaData(user.id)
          setSocialMedia(data)
        }
      } catch (error) {
        console.error('Failed to check user:', error)
      }
    }
    
    checkUser()
  }, [])

  const handleInputChange = (platform: keyof SocialMediaData, value: string) => {
    setSocialMedia(prev => ({
      ...prev,
      [platform]: value
    }))
  }

  const handleSave = async () => {
    if (!currentUserId) return
    
    setLoading(true)
    try {
      await socialMediaService.saveSocialMediaData(currentUserId, socialMedia)
      setMessage('✅ Social media data saved successfully!')
    } catch (error) {
      console.error('Failed to save:', error)
      setMessage('❌ Failed to save social media data')
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!currentUserId) return
    
    setLoading(true)
    try {
      const data = await socialMediaService.getUserSocialMediaData(currentUserId)
      setSocialMedia(data)
      setMessage('✅ Social media data loaded successfully!')
    } catch (error) {
      console.error('Failed to load:', error)
      setMessage('❌ Failed to load social media data')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <main>
        <Header currentPage="test" />
        <div className="send-container">
          <div className="send-form">
            <h2>Social Media Test</h2>
            <p>Please log in to test social media functionality.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <Header currentPage="test" />
      <div className="send-container">
        <div className="send-form">
          <h2>Social Media Test</h2>
          <p>User ID: {currentUserId}</p>
          
          {message && (
            <div style={{ 
              padding: '1rem', 
              margin: '1rem 0', 
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px'
            }}>
              {message}
            </div>
          )}

          <div className="form-section">
            <label>Social Media Accounts</label>
            <div className="social-media-inputs">
              <div className="social-input-group">
                <label htmlFor="instagram">Instagram</label>
                <input
                  type="text"
                  id="instagram"
                  placeholder="@username"
                  className="form-input"
                  value={socialMedia.instagram || ''}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                />
              </div>
              
              <div className="social-input-group">
                <label htmlFor="twitter">X (Twitter)</label>
                <input
                  type="text"
                  id="twitter"
                  placeholder="@username"
                  className="form-input"
                  value={socialMedia.twitter || ''}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                />
              </div>
              
              <div className="social-input-group">
                <label htmlFor="tiktok">TikTok</label>
                <input
                  type="text"
                  id="tiktok"
                  placeholder="@username"
                  className="form-input"
                  value={socialMedia.tiktok || ''}
                  onChange={(e) => handleInputChange('tiktok', e.target.value)}
                />
              </div>
              
              <div className="social-input-group">
                <label htmlFor="youtube">YouTube</label>
                <input
                  type="text"
                  id="youtube"
                  placeholder="@username"
                  className="form-input"
                  value={socialMedia.youtube || ''}
                  onChange={(e) => handleInputChange('youtube', e.target.value)}
                />
              </div>
              
              <div className="social-input-group">
                <label htmlFor="spotify">Spotify</label>
                <input
                  type="text"
                  id="spotify"
                  placeholder="username"
                  className="form-input"
                  value={socialMedia.spotify || ''}
                  onChange={(e) => handleInputChange('spotify', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              className="submit-btn"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Data'}
            </button>
            
            <button 
              className="submit-btn"
              onClick={handleLoad}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3>Current Data:</h3>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              {JSON.stringify(socialMedia, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </main>
  )
}