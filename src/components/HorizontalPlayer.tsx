'use client'

import { useState, useRef, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

interface HorizontalPlayerProps {
  track: SpotifyTrack
}

export default function HorizontalPlayer({ track }: HorizontalPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (track.preview_url && audioRef.current) {
      const audio = audioRef.current
      
      // 重置状态
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setIsLoading(true)
      
      audio.src = track.preview_url
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration || 30) // 默认30秒
        setIsLoading(false)
      }
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
      }
      
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
      
      const handleLoadStart = () => {
        setIsLoading(true)
      }
      
      const handleCanPlay = () => {
        setIsLoading(false)
      }
      
      const handleError = (e: Event) => {
        console.error('Audio loading error:', e)
        setIsLoading(false)
      }
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('loadstart', handleLoadStart)
      audio.addEventListener('canplay', handleCanPlay)
      audio.addEventListener('error', handleError)
      
      // 预加载音频
      audio.load()
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('loadstart', handleLoadStart)
        audio.removeEventListener('canplay', handleCanPlay)
        audio.removeEventListener('error', handleError)
      }
    }
  }, [track.preview_url])

  const togglePlay = async () => {
    if (!audioRef.current || !track.preview_url) {
      console.log('No audio ref or preview URL')
      return
    }
    
    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        // 确保音频已加载
        if (audioRef.current.readyState < 2) {
          setIsLoading(true)
          await new Promise((resolve) => {
            const handleCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay)
              resolve(void 0)
            }
            audioRef.current?.addEventListener('canplay', handleCanPlay)
          })
          setIsLoading(false)
        }
        
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('播放失败:', error)
      setIsPlaying(false)
      setIsLoading(false)
      
      // 如果播放失败，尝试重新加载
      if (audioRef.current) {
        audioRef.current.load()
      }
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

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="horizontal-player">
      <div className="player-card">
        <div className="player-header">
          <img 
            src={track.album.images[0]?.url} 
            alt={track.album.name}
            className="player-album-cover"
          />
          <div className="player-track-info">
            <div className="player-track-title">{track.name}</div>
            <div className="player-track-artist">{track.artists[0]?.name}</div>
          </div>
          <button 
            className="spotify-icon-btn mobile-only"
            onClick={openInSpotify}
            title="在Spotify中打开"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </button>
        </div>
        
        {track.preview_url ? (
          <div className="player-controls">
            <button 
              className="play-button"
              onClick={togglePlay}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="loading-spinner-small"></div>
              ) : isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            
            <div className="progress-section">
              <span className="time-display">{formatTime(currentTime)}</span>
              <div 
                className="progress-bar-container"
                onClick={handleProgressClick}
              >
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              <span className="time-display">{formatTime(duration)}</span>
            </div>
            

          </div>
        ) : (
          <div className="no-preview-controls">
            <div className="no-preview-message">
              No preview available
            </div>
            <button 
              className="spotify-play-btn-fallback"
              onClick={openInSpotify}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span>Play on Spotify</span>
            </button>
          </div>
        )}
      </div>
      
      <audio ref={audioRef} />
    </div>
  )
}