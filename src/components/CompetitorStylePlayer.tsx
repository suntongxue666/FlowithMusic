'use client'

import { useState, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

interface CompetitorStylePlayerProps {
  track: SpotifyTrack
}

export default function CompetitorStylePlayer({ track }: CompetitorStylePlayerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    // 检测设备和浏览器
    const userAgent = navigator.userAgent
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(userAgent) || /iPhone|iPad|iPod/i.test(userAgent)
    
    setIsMobile(isMobileDevice)
    setIsSafari(isSafariBrowser)
  }, [])

  // Extract track ID from Spotify URL or use the ID directly
  const getTrackId = (track: SpotifyTrack): string => {
    if (track.id && !track.id.includes('/')) {
      return track.id
    }
    
    // Extract from Spotify URL if needed
    const spotifyUrl = track.external_urls?.spotify
    if (spotifyUrl) {
      const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)
      if (match) {
        return match[1]
      }
    }
    
    return track.id
  }

  const trackId = getTrackId(track)
  
  // Different embed URL patterns with Safari optimization
  const embedUrls = {
    // Standard compact player - Safari友好
    compact: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`,
    
    // Large player with full controls - Safari优化
    full: isSafari 
      ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
      : `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=coverart&t=0`,
    
    // Mobile specific
    mobile: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=list`
  }

  const handleIframeError = () => {
    setShowFallback(true)
  }

  const openInSpotify = () => {
    window.open(track.external_urls?.spotify, '_blank', 'noopener,noreferrer')
  }

  // Safari mobile fallback UI
  if (showFallback || (isSafari && isMobile)) {
    return (
      <div className="competitor-player-container">
        <div className="spotify-fallback large">
          <div className="fallback-content large">
            <div className="fallback-header">
              <img 
                src={track.album.images[0]?.url} 
                alt={track.album.name}
                className="fallback-cover large"
              />
              <div className="fallback-info">
                <div className="track-name large">{track.name}</div>
                <div className="track-artist large">{track.artists[0]?.name}</div>
                <div className="track-album">{track.album.name}</div>
              </div>
            </div>
            <div className="fallback-actions">
              <button 
                className="spotify-open-btn large"
                onClick={openInSpotify}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>在Spotify中播放</span>
              </button>
              <div className="fallback-note">
                Safari移动端暂不支持Spotify播放器嵌入
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="competitor-player-container">
      {/* 响应式播放器 */}
      <div className="main-player">
        <iframe
          style={{ borderRadius: '12px' }}
          src={isMobile ? embedUrls.mobile : embedUrls.full}
          width="100%"
          height={isMobile ? "152" : "352"}
          frameBorder="0"
          allowTransparency={true}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`${track.name} by ${track.artists[0]?.name}`}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    </div>
  )
}