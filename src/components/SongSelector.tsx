'use client'

import { useState, useRef, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

interface SongSelectorProps {
  onSelect: (track: SpotifyTrack) => void
  selectedTrack?: SpotifyTrack | null
}

export default function SongSelector({ onSelect, selectedTrack }: SongSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load recommendations when component mounts
  useEffect(() => {
    loadRecommendations()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/spotify/recommendations')
      const data = await response.json()
      if (data.tracks && data.tracks.length > 0) {
        setRecommendations(data.tracks)
      } else {
        // Fallback: search for popular songs
        const fallbackResponse = await fetch('/api/spotify/search?q=popular%20hits%202024')
        const fallbackData = await fallbackResponse.json()
        setRecommendations(fallbackData.tracks || [])
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error)
      // Try to load some popular songs as fallback
      try {
        const fallbackResponse = await fetch('/api/spotify/search?q=top%20hits')
        const fallbackData = await fallbackResponse.json()
        setRecommendations(fallbackData.tracks || [])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.tracks || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchTracks(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const handleInputClick = () => {
    setIsOpen(true)
    if (recommendations.length === 0 && !loading) {
      loadRecommendations()
    }
  }

  const handleTrackSelect = (track: SpotifyTrack) => {
    onSelect(track)
    setSearchQuery(track.name + ' - ' + track.artists[0]?.name)
    setIsOpen(false)
    stopAudio()
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsOpen(true)
  }

  const playPreview = (track: SpotifyTrack) => {
    if (!track.preview_url) return

    if (playingTrack === track.id) {
      stopAudio()
      return
    }

    stopAudio()
    
    if (audioRef.current) {
      audioRef.current.src = track.preview_url
      audioRef.current.play()
      setPlayingTrack(track.id)
      
      audioRef.current.onended = () => {
        setPlayingTrack(null)
      }
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlayingTrack(null)
  }

  const displayTracks = searchQuery.trim() ? searchResults : recommendations
  const showRecommendationTitle = !searchQuery.trim() && recommendations.length > 0

  return (
    <div className="song-selector" ref={dropdownRef}>
      <div className="song-search">
        <input 
          type="text" 
          placeholder="Search and select your song"
          className="form-input song-input"
          value={searchQuery}
          onChange={handleInputChange}
          onClick={handleInputClick}
        />
        {searchQuery && (
          <button 
            className="clear-search-btn"
            onClick={handleClearSearch}
          >
            ✕
          </button>
        )}
        <button 
          className="search-dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d={isOpen ? "M6 3L10 7H2L6 3Z" : "M6 9L2 5H10L6 9Z"} fill="currentColor"/>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="song-dropdown">
          {showRecommendationTitle && (
            <div className="dropdown-header">
              <h4>猜你喜欢</h4>
            </div>
          )}
          
          {loading && (
            <div className="loading">加载中...</div>
          )}
          
          {displayTracks.length > 0 && (
            <div className="track-list">
              {displayTracks.map((track) => (
                <div 
                  key={track.id} 
                  className="track-item"
                  onClick={() => handleTrackSelect(track)}
                >
                  <div className="track-info">
                    <img 
                      src={track.album.images[0]?.url || '/default-album.png'} 
                      alt={track.album.name}
                      className="album-cover"
                    />
                    <div className="track-details">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">{track.artists[0]?.name}</div>
                    </div>
                  </div>
                  <div className="track-actions">
                    {track.preview_url && (
                      <button 
                        className="play-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          playPreview(track)
                        }}
                      >
                        {playingTrack === track.id ? '⏸️' : '▶️'}
                      </button>
                    )}
                    <a 
                      href={track.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="spotify-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && displayTracks.length === 0 && searchQuery.trim() && (
            <div className="no-results">未找到相关歌曲</div>
          )}
        </div>
      )}
      
      <audio ref={audioRef} />
    </div>
  )
}