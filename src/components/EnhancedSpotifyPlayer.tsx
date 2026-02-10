'use client'

import { useState, useRef, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'
import { useUser } from '@/contexts/UserContext'

interface EnhancedSpotifyPlayerProps {
  track: SpotifyTrack
}

export default function EnhancedSpotifyPlayer({ track }: EnhancedSpotifyPlayerProps) {
  const { isAuthenticated } = useUser()
  const [isMobile, setIsMobile] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // 检测设备
    const userAgent = navigator.userAgent
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    setIsMobile(isMobileDevice)
  }, [])

  // 音频播放逻辑（用于预览）
  useEffect(() => {
    if (track.preview_url && audioRef.current && !isAuthenticated) {
      const audio = audioRef.current
      
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setIsLoading(true)
      
      audio.src = track.preview_url
      
      const handleLoadedMetadata = () => {
        setDuration(Math.min(audio.duration || 30, 30)) // 最多30秒预览
        setIsLoading(false)
      }
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        // 未登录用户限制播放时间
        if (!isAuthenticated && audio.currentTime >= 30) {
          audio.pause()
          setIsPlaying(false)
        }
      }
      
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
      
      const handleError = () => {
        setIsLoading(false)
        setShowFallback(true)
      }
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)
      
      audio.load()
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
      }
    }
  }, [track.preview_url, isAuthenticated])

  const togglePreviewPlay = async () => {
    if (!audioRef.current || !track.preview_url) return
    
    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('预览播放失败:', error)
      setIsPlaying(false)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const openInSpotify = () => {
    window.open(track.external_urls?.spotify, '_blank', 'noopener,noreferrer')
  }

  // Extract track ID from Spotify URL or use the ID directly
  const getTrackId = (track: SpotifyTrack): string => {
    if (track.id && !track.id.includes('/')) {
      return track.id
    }
    
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
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  // 移动端或显示fallback时的处理
  if (isMobile || showFallback) {
    return (
      <div className="enhanced-spotify-player mobile-fallback">
        <div className="player-fallback-card">
          <div className="fallback-header">
            <img 
              src={track.album.images[0]?.url} 
              alt={track.album.name}
              className="fallback-album-cover"
            />
            <div className="fallback-track-info">
              <div className="fallback-track-title">{track.name}</div>
              <div className="fallback-track-artist">{track.artists[0]?.name}</div>
            </div>
          </div>
          
          {!isAuthenticated && track.preview_url ? (
            <div className="preview-controls">
              <button 
                className="preview-play-btn"
                onClick={togglePreviewPlay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner-small"></div>
                ) : isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              <div className="preview-progress">
                <span className="preview-time">{formatTime(currentTime)}</span>
                <div 
                  className="preview-progress-bar"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="preview-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <span className="preview-time">{formatTime(duration)}</span>
              </div>
              
              <div className="preview-note">
                {isAuthenticated ? 'Full track available' : '30s preview'}
              </div>
            </div>
          ) : null}
          
          <button 
            className="spotify-open-btn-enhanced"
            onClick={openInSpotify}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>{isAuthenticated ? 'Play Full Track on Spotify' : 'Play on Spotify'}</span>
          </button>
        </div>
        
        <audio ref={audioRef} />
      </div>
    )
  }

  // 桌面端 - 使用Spotify嵌入播放器
  return (
    <div className="enhanced-spotify-player desktop">
      <div className="spotify-embed-wrapper">
        <iframe
          style={{ 
            borderRadius: '12px', 
            width: '100%', 
            height: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          src={embedUrl}
          width="100%"
          height="180"
          frameBorder="0"
          allowTransparency={true}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`${track.name} by ${track.artists[0]?.name}`}
          onError={() => setShowFallback(true)}
        />
      </div>
      

      
      {!isAuthenticated && track.preview_url && (
        <audio ref={audioRef} />
      )}
    </div>
  )
}