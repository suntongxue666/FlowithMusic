'use client'

import { useEffect, useState, useRef } from 'react'
import { checkIsChinaIP, searchAppleMusic, AppleMusicTrack } from '@/lib/audioService'

interface SpotifyTrack {
  id: string
  name: string
  duration_ms?: number
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
  countryCode?: string
}

export default function ColorfulSpotifyPlayer({ track, countryCode }: ColorfulSpotifyPlayerProps) {
  const [dominantColor, setDominantColor] = useState<string>('#1DB954')
  const [isChinaDetails, setIsChinaDetails] = useState<{ isChina: boolean, checked: boolean }>({ isChina: false, checked: false })
  const [appleTrack, setAppleTrack] = useState<AppleMusicTrack | null>(null)
  const [fallbackError, setFallbackError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 1. Check IP on mount
  useEffect(() => {
    async function checkIn() {
      // Priority 1: Use server-detected countryCode
      if (countryCode === 'CN') {
        setIsChinaDetails({ isChina: true, checked: true })
        fetchAppleMusicFallback()
        return
      }

      // Priority 2: Use client-side signals
      const isCN = await checkIsChinaIP()
      setIsChinaDetails({ isChina: isCN, checked: true })

      if (isCN) {
        // Prepare fallback immediately
        fetchAppleMusicFallback()
      }
    }
    checkIn()
  }, [countryCode])

  // 2. Fetch Apple Music if needed
  const fetchAppleMusicFallback = async () => {
    try {
      if (!track || !track.artists || track.artists.length === 0) return

      const searchCountry = countryCode || (isChinaDetails.isChina ? 'CN' : 'US')
      const result = await searchAppleMusic(track.name, track.artists[0].name, track.duration_ms, searchCountry)
      if (result) {
        setAppleTrack(result)
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

    if (appleTrack) {
      return (
        <div
          className="w-full rounded-xl overflow-hidden shadow-lg flex flex-col sm:flex-row h-auto sm:h-[152px] transition-all duration-300 border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${dominantColor}44 0%, #121212 100%)`,
          }}
        >
          <div className="relative w-full sm:w-[152px] h-[152px] flex-shrink-0">
            <img
              src={appleTrack.artworkUrl100?.replace('100x100', '300x300')}
              alt={appleTrack.trackName}
              className="w-full h-full object-cover"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-all group"
            >
              <div className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center pl-1 shadow-xl group-hover:scale-110 transition-transform">
                {isPlaying ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"></path></svg>
                )}
              </div>
            </button>
            <audio
              ref={audioRef}
              src={appleTrack.previewUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between text-white">
            <div className="space-y-1">
              <h3 className="font-bold text-xl line-clamp-1 group-hover:text-[#1DB954] transition-colors">{appleTrack.trackName}</h3>
              <p className="text-gray-400 font-medium line-clamp-1">{appleTrack.artistName}</p>
            </div>

            <div className="mt-4">
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-2 overflow-hidden backdrop-blur-sm">
                <div className="bg-[#1DB954] h-full w-full animate-progress origin-left" style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transform: isPlaying ? 'scaleX(1)' : 'scaleX(0)',
                  transition: isPlaying ? 'transform 30s linear' : 'none'
                }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#1DB954] rounded-full animate-pulse"></span>
                  PREVIEW MODE
                </div>
                <a
                  href={appleTrack.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition-colors flex items-center gap-2"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-2.5 h-2.5 invert" alt="Apple" />
                  LISTEN FULL
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