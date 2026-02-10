'use client'

import { useEffect, useState, useRef } from 'react'
import { checkIsChinaIP, searchAppleMusic, AppleMusicTrack } from '@/lib/audioService'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  preview_url: string | null
  external_urls: {
    spotify: string
  }
}

interface ColorfulSpotifyPlayerProps {
  track: SpotifyTrack
}

export default function ColorfulSpotifyPlayer({ track }: ColorfulSpotifyPlayerProps) {
  const [dominantColor, setDominantColor] = useState<string>('#1DB954')
  const [isChinaDetails, setIsChinaDetails] = useState<{ isChina: boolean, checked: boolean }>({ isChina: false, checked: false })
  const [appleTimestamp, setAppleTimestamp] = useState<AppleMusicTrack | null>(null)
  const [fallbackError, setFallbackError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 1. Check IP on mount
  useEffect(() => {
    async function checkIn() {
      const isCN = await checkIsChinaIP()
      setIsChinaDetails({ isChina: isCN, checked: true })

      if (isCN) {
        // Prepare fallback immediately
        fetchAppleMusicFallback()
      }
    }
    checkIn()
  }, [])

  // 2. Fetch Apple Music if needed
  const fetchAppleMusicFallback = async () => {
    try {
      if (!track || !track.artists || track.artists.length === 0) return

      const result = await searchAppleMusic(track.name, track.artists[0].name)
      if (result) {
        setAppleTimestamp(result)
      } else {
        setFallbackError('Song not available in your region')
      }
    } catch (e) {
      console.error('Fallback fetch failed', e)
      setFallbackError('Song not available in your region')
    }
  }

  // 3. Extract Color (Simplified for brevity, or keep existing logic)
  useEffect(() => {
    // For now, let's just use a default color or extract from image if needed.
    // Keeping it simple to minimize dependencies.
    setDominantColor('#1DB954')
  }, [track])


  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Render logic
  // If IP check not done -> show loading skeleton or Spotify default
  // If China -> show Apple Music Player
  // If Not China -> show Spotify (default)

  if (!isChinaDetails.checked) {
    return <div className="w-full h-[152px] bg-gray-100 rounded-xl animate-pulse"></div>
  }

  if (isChinaDetails.isChina) {
    if (fallbackError) {
      return (
        <div className="w-full h-[152px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 border border-gray-200">
          <p>🚫 {fallbackError}</p>
        </div>
      )
    }

    if (appleTimestamp) {
      return (
        <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row h-auto sm:h-[152px]">
          <div className="relative w-full sm:w-[152px] h-[152px] bg-gray-100 flex-shrink-0">
            <img
              src={appleTimestamp.artworkUrl100?.replace('100x100', '300x300')}
              alt={appleTimestamp.trackName}
              className="w-full h-full object-cover"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center pl-1 shadow-lg group-hover:scale-105 transition-transform">
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                )}
              </div>
            </button>
            <audio
              ref={audioRef}
              src={appleTimestamp.previewUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg line-clamp-1">{appleTimestamp.trackName}</h3>
              <p className="text-gray-600 line-clamp-1">{appleTimestamp.artistName}</p>
            </div>

            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                <div className="bg-pink-500 h-full w-full animate-progress origin-left" style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transform: isPlaying ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 30s linear' // 30s preview
                }}></div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Preview (30s)</span>
                <a
                  href={appleTimestamp.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 hover:underline flex items-center gap-1"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Apple_Music_logo.svg/210px-Apple_Music_logo.svg.png" className="w-4 h-4" alt="Apple Music" />
                  Listen on Apple Music
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Loading state while fetching Apple Music
    return (
      <div className="w-full h-[152px] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Default: Spotify Embed
  return (
    <div
      className="w-full rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md bg-white border border-gray-100"
      style={{
        background: `linear-gradient(135deg, ${dominantColor}15, #ffffff 60%)`
      }}
    >
      <iframe
        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block"
      ></iframe>
    </div>
  )
}