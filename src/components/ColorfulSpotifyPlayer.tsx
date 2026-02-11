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
  countryCode?: string // Prop remains for backward compatibility but internal logic will verify
}

export default function ColorfulSpotifyPlayer({ track, countryCode: initialCountryCode }: ColorfulSpotifyPlayerProps) {
  const [dominantColor, setDominantColor] = useState<string>('#1DB954')
  const [isChinaDetails, setIsChinaDetails] = useState<{ isChina: boolean, checked: boolean }>({ isChina: false, checked: false })
  const [appleTrack, setAppleTrack] = useState<AppleMusicTrack | null>(null)
  const [fallbackError, setFallbackError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 1. Check IP on mount - PURE CLIENT SIDE RELIABILITY
  useEffect(() => {
    async function checkIn() {
      try {
        // Set a hard timeout of 1 second for IP detection
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 1000)
        )

        // Priority 1: Use client-side signals (Timezone check is instant)
        const isCN = await Promise.race([checkIsChinaIP(), timeoutPromise])

        console.log('🌍 Regional detection result:', isCN ? 'China' : 'Global')

        // Only trigger update if it's confirmingly China
        if (isCN) {
          setIsChinaDetails({ isChina: true, checked: true })
          fetchAppleMusicFallback(true)
        } else {
          // Explicitly set global to stop any further loading state
          setIsChinaDetails({ isChina: false, checked: true })
        }
      } catch (e) {
        console.warn('🌍 Detection timed out or failed, defaulting to Global/Spotify')
        setIsChinaDetails({ isChina: false, checked: true })
      }
    }
    checkIn()
  }, [track.id]) // Re-check if track changes

  // 2. Fetch Apple Music if needed
  const fetchAppleMusicFallback = async (isCN: boolean) => {
    try {
      if (!track || !track.artists || track.artists.length === 0) return

      const searchCountry = isCN ? 'CN' : 'US'
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

  // 3. Toggle Play
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Loading state (pulse skeleton)
  if (!isChinaDetails.checked) {
    return (
      <div className="w-full h-[152px] bg-gray-100 rounded-2xl animate-pulse border border-black/5"></div>
    )
  }

  // China Logic -> Apple Music Fallback
  if (isChinaDetails.isChina) {
    if (fallbackError) {
      return (
        <div className="w-full h-[152px] bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 border border-black/5 p-4 text-center">
          <p className="text-sm">🚫 {fallbackError}</p>
          <a href={track.external_urls.spotify} target="_blank" className="text-[10px] mt-2 underline opacity-60">Try Spotify anyway</a>
        </div>
      )
    }

    if (appleTrack) {
      return (
        <div
          key={`apple-${track.id}`}
          className="w-full rounded-2xl overflow-hidden shadow-sm flex flex-row h-[152px] border border-black/5 relative group bg-[#121212]"
          style={{
            background: `linear-gradient(135deg, ${dominantColor}33 0%, #121212 100%)`,
          }}
        >
          {/* Cover Art - Fixed Size */}
          <div className="relative w-[152px] h-[152px] flex-shrink-0 bg-black/40 overflow-hidden">
            <img
              src={appleTrack.artworkUrl100?.replace('100x100', '400x400')}
              alt={appleTrack.trackName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-all backdrop-blur-[2px]"
            >
              <div className="w-12 h-12 bg-[#fa243c] rounded-full flex items-center justify-center pl-1 shadow-2xl hover:scale-110 transition-transform active:scale-95">
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"></path></svg>
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
          <div className="p-6 flex-1 flex flex-col justify-between text-white min-w-0">
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg leading-tight truncate tracking-tight">{appleTrack.trackName}</h3>
              <p className="text-white/60 text-sm font-medium truncate italic tracking-wide">{appleTrack.artistName}</p>
            </div>

            <div className="space-y-3">
              <div className="w-full bg-white/10 rounded-full h-[3px] overflow-hidden">
                <div className="bg-[#fa243c] h-full animate-progress origin-left" style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transform: isPlaying ? 'scaleX(1)' : 'scaleX(0)',
                  transition: isPlaying ? 'transform 30s linear' : 'none',
                  width: '100%'
                }}></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Apple Preview</span>
                </div>
                <a
                  href={appleTrack.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-black tracking-widest transition-all hover:px-5 active:scale-95 uppercase"
                >
                  Listen Full ↗
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
      <div className="w-full h-[152px] bg-gray-50 rounded-2xl flex items-center justify-center border border-black/5">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Finding music...</span>
        </div>
      </div>
    )
  }

  // Not China -> Spotify Embed (Default & Polished)
  return (
    <div
      key={`spotify-${track.id}`}
      className="w-full rounded-2xl overflow-hidden shadow-sm transition-all duration-500 hover:shadow-md bg-white border border-black/5"
    >
      <iframe
        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block"
        style={{ borderRadius: '12px', minHeight: '152px' }}
      ></iframe>
    </div>
  )
}