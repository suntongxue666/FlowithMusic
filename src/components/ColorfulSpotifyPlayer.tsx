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

  // 3. Extract Color
  useEffect(() => {
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

  // If IP check not done -> show loading skeleton
  if (!isChinaDetails.checked) {
    return <div className="w-full h-[152px] bg-gray-100 rounded-xl animate-pulse"></div>
  }

  // China Logic -> Apple Music Fallback
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
          className="w-full rounded-2xl overflow-hidden shadow-lg flex flex-row h-[152px] border border-white/10 relative group"
          style={{
            background: `linear-gradient(135deg, ${dominantColor}44 0%, #121212 100%)`,
          }}
        >
          {/* Cover Art - Fixed Size to prevent "Huge Image" */}
          <div className="relative w-[152px] h-[152px] flex-shrink-0 bg-black/20">
            <img
              src={appleTrack.artworkUrl100?.replace('100x100', '400x400')}
              alt={appleTrack.trackName}
              className="w-full h-full object-cover"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-all"
            >
              <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center pl-1 shadow-xl hover:scale-110 transition-transform">
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"></path></svg>
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

          {/* Info Section */}
          <div className="p-5 flex-1 flex flex-col justify-between text-white min-w-0">
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-tight truncate">{appleTrack.trackName}</h3>
              <p className="text-gray-400 text-sm font-medium truncate italic opacity-80">{appleTrack.artistName}</p>
            </div>

            <div className="">
              <div className="w-full bg-white/10 rounded-full h-1 mb-2 overflow-hidden">
                <div className="bg-[#1DB954] h-full w-full animate-progress origin-left" style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transform: isPlaying ? 'scaleX(1)' : 'scaleX(0)',
                  transition: isPlaying ? 'transform 30s linear' : 'none'
                }}></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white">Apple Music Preview</span>
                </div>
                <a
                  href={appleTrack.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 text-[9px] font-black tracking-wider transition-colors inline-block"
                >
                  FULL SONG ↗
                </a>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes progress {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
            .animate-progress {
              animation: progress 30s linear;
            }
          `}</style>
        </div>
      )
    }

    return (
      <div className="w-full h-[152px] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Not China -> Spotify Embed (Default)
  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md bg-white border border-gray-100"
    >
      <iframe
        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ borderRadius: '12px' }}
      ></iframe>
    </div>
  )
}