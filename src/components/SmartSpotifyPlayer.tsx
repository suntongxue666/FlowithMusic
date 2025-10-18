'use client'

import { useState, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

interface SmartSpotifyPlayerProps {
  track: SpotifyTrack
  size?: 'compact' | 'large'
}

export default function SmartSpotifyPlayer({ track, size = 'large' }: SmartSpotifyPlayerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // 默认30秒试听
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    // 检测设备类型
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobile = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent)
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // 如果有预览URL，创建音频对象
    if (track.preview_url) {
      const audioElement = new Audio(track.preview_url)
      audioElement.addEventListener('loadedmetadata', () => {
        setDuration(audioElement.duration || 30)
      })
      audioElement.addEventListener('timeupdate', () => {
        setCurrentTime(audioElement.currentTime)
      })
      audioElement.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
      setAudio(audioElement)

      return () => {
        audioElement.pause()
        audioElement.src = ''
      }
    }
  }, [track.preview_url])

  const togglePlay = () => {
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const openInSpotify = () => {
    if (isMobile) {
      // 移动端：尝试打开Spotify App，失败则打开网页版
      const spotifyAppUrl = `spotify:track:${track.id}`
      const spotifyWebUrl = track.external_urls.spotify
      
      // 尝试打开App
      window.location.href = spotifyAppUrl
      
      // 如果App没有打开，2秒后跳转到网页版
      setTimeout(() => {
        window.open(spotifyWebUrl, '_blank')
      }, 2000)
    } else {
      // PC端：直接打开网页版
      window.open(track.external_urls.spotify, '_blank')
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  if (size === 'compact') {
    return (
      <div className="smart-player-compact">
        <div className="player-header">
          <img 
            src={track.album.images[0]?.url || '/default-album.png'}
            alt={track.name}
            className="album-cover-compact"
          />
          <div className="track-info-compact">
            <div className="track-title-compact">{track.name}</div>
            <div className="track-artist-compact">{track.artists[0]?.name}</div>
          </div>
          
          <div className="player-controls-compact">
            {track.preview_url ? (
              <button 
                onClick={togglePlay}
                className="play-button-compact"
                title={isPlaying ? 'Pause' : 'Play Preview'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
            ) : (
              <div className="no-preview-compact">🎵</div>
            )}
            
            <button 
              onClick={openInSpotify}
              className="spotify-button-compact"
              title="Open in Spotify"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </button>
          </div>
        </div>
        
        {track.preview_url && (
          <div className="progress-bar-compact">
            <div className="progress-bg-compact">
              <div 
                className="progress-fill-compact"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="time-info-compact">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="smart-player-large">
      <div className="player-card-smart">
        <div className="player-header-smart">
          <img 
            src={track.album.images[0]?.url || '/default-album.png'}
            alt={track.name}
            className="album-cover-smart"
          />
          <div className="track-info-smart">
            <div className="track-title-smart">{track.name}</div>
            <div className="track-artist-smart">{track.artists[0]?.name}</div>
            <div className="track-album-smart">{track.album.name}</div>
          </div>
        </div>

        <div className="player-controls-smart">
          {track.preview_url ? (
            <>
              <button 
                onClick={togglePlay}
                className="play-button-smart"
                title={isPlaying ? 'Pause Preview' : 'Play Preview'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <div className="progress-section-smart">
                <span className="time-display-smart">{formatTime(currentTime)}</span>
                <div className="progress-container-smart">
                  <div className="progress-bg-smart">
                    <div 
                      className="progress-fill-smart"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                <span className="time-display-smart">{formatTime(duration)}</span>
              </div>
            </>
          ) : (
            <div className="no-preview-smart">
              <span>🎵 Preview not available</span>
            </div>
          )}
          
          <button 
            onClick={openInSpotify}
            className="spotify-button-smart"
            title={isMobile ? "Open in Spotify App" : "Open in Spotify"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>{isMobile ? "Open in App" : "Open in Spotify"}</span>
          </button>
        </div>

        {!track.preview_url && (
          <div className="fallback-message-smart">
            <p>Preview not available for this track.</p>
            <p>{isMobile ? "Tap 'Open in App' to listen on Spotify." : "Click 'Open in Spotify' to listen."}</p>
          </div>
        )}
      </div>
    </div>
  )
}