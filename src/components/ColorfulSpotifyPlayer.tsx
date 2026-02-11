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
          <button
            onClick={() => setIsChinaDetails({ isChina: false, checked: true })}
            className="text-[10px] mt-2 underline opacity-60 hover:opacity-100"
          >
            Force Spotify
          </button>
        </div>
      )
    }

    if (appleTrack) {
      return (
        <div
          key={`apple-${track.id}`}
          className="w-full rounded-[24px] overflow-hidden shadow-2xl flex flex-row h-[180px] border border-white/10 relative group backdrop-blur-md"
          style={{
            background: `linear-gradient(135deg, ${dominantColor}66 0%, #1a1a1a 100%)`,
          }}
        >
          {/* Cover Art - Left Side */}
          <div className="flex items-center justify-center p-4 pr-0">
            <div className="relative w-[132px] h-[132px] flex-shrink-0 shadow-2xl rounded-xl overflow-hidden group/cover">
              <img
                src={appleTrack.artworkUrl100?.replace('100x100', '600x600')}
                alt={appleTrack.trackName}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-110"
              />
              <div className="absolute inset-0 bg-black/20 group-hover/cover:bg-black/0 transition-colors duration-300" />
            </div>
          </div>

          {/* Info & Controls Section */}
          <div className="flex-1 p-6 flex flex-col justify-center min-w-0 relative">
            <div className="mb-auto">
              <div className="flex justify-between items-start pt-1">
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="font-bold text-xl leading-tight truncate text-white tracking-tight mb-1">
                    {appleTrack.trackName}
                  </h3>
                  <p className="text-white/70 text-base font-medium truncate italic tracking-wide">
                    {appleTrack.artistName}
                  </p>
                </div>
                <div className="flex-shrink-0 pt-1">
                  <div className="w-6 h-6 opacity-40 hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.646 15.646c-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-3.232-3.232-3.232 3.232c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023 0-1.414l3.232-3.232-3.232-3.232c-.391-.391-.391-1.023 0-1.414s1.023-.391 1.414 0l3.232 3.232 3.232-3.232c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414l-3.232 3.232 3.232 3.232c.391.391.391 1.023 0 1.414z" opacity=".2" /></svg>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white/60 font-medium uppercase tracking-widest border border-white/5">
                  Apple Preview
                </div>
                <button
                  onClick={() => setIsChinaDetails({ isChina: false, checked: true })}
                  className="text-[10px] text-white/30 hover:text-white/80 transition-all underline underline-offset-4"
                >
                  Use Spotify
                </button>
              </div>
            </div>

            {/* Bottom Controls Area */}
            <div className="flex flex-col gap-3 mt-4">
              {/* Progress Bar */}
              <div className="relative group/progress">
                <div className="w-full bg-white/10 rounded-full h-[4px] overflow-hidden">
                  <div
                    className="bg-white h-full origin-left"
                    style={{
                      transform: isPlaying ? 'scaleX(1)' : 'scaleX(0)',
                      transition: isPlaying ? 'transform 30s linear' : 'none',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[10px] text-white/40 font-medium tabular-nums">0:00</span>
                  <span className="text-[10px] text-white/40 font-medium tabular-nums">0:30</span>
                </div>
              </div>

              {/* Play Button & Details */}
              <div className="flex justify-between items-center">
                <a
                  href={appleTrack.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-white/50 hover:text-white transition-colors flex items-center gap-1.5 group/link"
                >
                  Listen on Apple Music <span className="group-hover/link:translate-x-0.5 transition-transform">→</span>
                </a>

                <div className="flex items-center gap-4">
                  <button className="text-white/40 hover:text-white transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 10l-4 4-4-4h8z" /></svg>
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-black"
                  >
                    {isPlaying ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"></path></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={appleTrack.previewUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
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
      className="w-full rounded-2xl overflow-hidden shadow-sm transition-all duration-500 hover:shadow-md bg-white border border-black/5 group relative"
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

      {/* Subtle Apple Music Switcher for debugging/fallback */}
      <div className="absolute bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setIsChinaDetails({ isChina: true, checked: true })
            fetchAppleMusicFallback(true)
          }}
          className="text-[8px] font-black uppercase tracking-widest text-black/20 hover:text-black/60 bg-white/80 px-2 py-1 rounded-full border border-black/5"
        >
          Try Apple Music
        </button>
      </div>
    </div>
  )
}