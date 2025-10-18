'use client'

import { useState, useRef, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

interface MusicPlayerProps {
  track: SpotifyTrack
  isPlaying: boolean
  onPlayPause: () => void
}

export default function MusicPlayer({ track, isPlaying, onPlayPause }: MusicPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Spotify preview is 30 seconds
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration || 30)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', onPlayPause)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', onPlayPause)
    }
  }, [onPlayPause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play()
    } else {
      audio.pause()
    }
  }, [isPlaying])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  if (!track.preview_url) {
    return (
      <div className="music-player no-preview">
        <div className="track-info-player">
          <img 
            src={track.album.images[0]?.url || '/default-album.png'} 
            alt={track.album.name}
            className="album-cover-player"
          />
          <div className="track-details-player">
            <div className="track-name-player">{track.name}</div>
            <div className="track-artist-player">{track.artists[0]?.name}</div>
          </div>
        </div>
        <div className="no-preview-text">预览不可用</div>
      </div>
    )
  }

  return (
    <div className="music-player">
      <audio ref={audioRef} src={track.preview_url} />
      
      <div className="track-info-player">
        <img 
          src={track.album.images[0]?.url || '/default-album.png'} 
          alt={track.album.name}
          className="album-cover-player"
        />
        <div className="track-details-player">
          <div className="track-name-player">{track.name}</div>
          <div className="track-artist-player">{track.artists[0]?.name}</div>
        </div>
      </div>

      <div className="player-controls">
        <button 
          className="play-pause-btn"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="time-info">
          <span className="current-time">{formatTime(currentTime)}</span>
          <div className="progress-container" onClick={handleSeek}>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="duration">{formatTime(duration)}</span>
        </div>

        <a 
          href={track.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="spotify-link-player"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </a>
      </div>
    </div>
  )
}