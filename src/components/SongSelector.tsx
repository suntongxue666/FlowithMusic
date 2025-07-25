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