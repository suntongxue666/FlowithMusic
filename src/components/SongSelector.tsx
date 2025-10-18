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
    console.log('SongSelector mounting on:', {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    })
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
      console.log('Loading Spotify recommendations...')
      
      // 添加超时保护，防止API卡住
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
      
      const response = await fetch('/api/spotify/recommendations', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Recommendations API failed: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.tracks && data.tracks.length > 0) {
        setRecommendations(data.tracks)
        console.log('✅ Loaded recommendations:', data.tracks.length)
      } else {
        throw new Error('No tracks in recommendations response')
      }
    } catch (error) {
      console.warn('Recommendations failed, trying fallback:', error)
      
      // Fallback 1: 尝试搜索热门歌曲
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时
        
        const fallbackResponse = await fetch('/api/spotify/search?q=popular%20hits%202024', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          if (fallbackData.tracks && fallbackData.tracks.length > 0) {
            setRecommendations(fallbackData.tracks)
            console.log('✅ Loaded fallback tracks:', fallbackData.tracks.length)
            return
          }
        }
      } catch (fallbackError) {
        console.warn('First fallback failed:', fallbackError)
      }
      
      // Fallback 2: 尝试更简单的搜索
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时
        
        const simpleFallbackResponse = await fetch('/api/spotify/search?q=music', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (simpleFallbackResponse.ok) {
          const simpleFallbackData = await simpleFallbackResponse.json()
          if (simpleFallbackData.tracks && simpleFallbackData.tracks.length > 0) {
            setRecommendations(simpleFallbackData.tracks)
            console.log('✅ Loaded simple fallback tracks:', simpleFallbackData.tracks.length)
            return
          }
        }
      } catch (simpleFallbackError) {
        console.warn('Simple fallback also failed:', simpleFallbackError)
      }
      
      // 如果所有方法都失败，设置空数组避免无限加载
      console.warn('All recommendation methods failed, using empty array')
      setRecommendations([])
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
      console.log('Searching for:', query)
      
      // 添加超时保护
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时
      
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Search API failed: ${response.status}`)
      }
      
      const data = await response.json()
      setSearchResults(data.tracks || [])
      console.log(`✅ Search found ${data.tracks?.length || 0} tracks`)
    } catch (error) {
      console.warn('Search failed:', error)
      setSearchResults([])
      
      // 可以在这里添加用户友好的错误提示
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Search request timed out')
      }
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