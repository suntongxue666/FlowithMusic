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

export default function ColorfulSpotifyPlayer({ track, countryCode: initialCountryCode }: ColorfulSpotifyPlayerProps) {
  const [dominantColor, setDominantColor] = useState<string>('#535353')
  const [isChinaDetails, setIsChinaDetails] = useState<{ isChina: boolean, checked: boolean }>({ isChina: false, checked: false })
  const [appleTrack, setAppleTrack] = useState<AppleMusicTrack | null>(null)
  const [fallbackError, setFallbackError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  // 1. Color Extraction Logic
  useEffect(() => {
    const imageUrl = (isChinaDetails.isChina && appleTrack)
      ? appleTrack.artworkUrl100?.replace('100x100', '300x300')
      : (track.album?.images?.[0]?.url)

    if (!imageUrl) return

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = 1
      canvas.height = 1
      ctx.drawImage(img, 0, 0, 1, 1)
      const data = ctx.getImageData(0, 0, 1, 1).data
      // Make it slightly darker for better text readability
      const r = Math.max(0, data[0] - 20)
      const g = Math.max(0, data[1] - 20)
      const b = Math.max(0, data[2] - 20)
      setDominantColor(`rgb(${r}, ${g}, ${b})`)
    }
  }, [track.id, appleTrack?.trackName, isChinaDetails.isChina])

  // 2. Regional Check
  useEffect(() => {
    async function checkIn() {
      try {
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 1000)
        )
        const isCN = await Promise.race([checkIsChinaIP(), timeoutPromise])
        if (isCN) {
          console.log('📍 Region: China (CN) - Using Apple Music Player')
          setIsChinaDetails({ isChina: true, checked: true })
          fetchAppleMusicFallback(true)
        } else {
          console.log('🌐 Region: Global - Using Spotify Player')
          setIsChinaDetails({ isChina: false, checked: true })
        }
      } catch (e) {
        setIsChinaDetails({ isChina: false, checked: true })
      }
    }
    checkIn()
  }, [track.id])

  const fetchAppleMusicFallback = async (isCN: boolean) => {
    try {
      if (!track || !track.artists?.[0]) return
      const searchCountry = isCN ? 'CN' : 'US'
      const result = await searchAppleMusic(track.name, track.artists[0].name, track.duration_ms, searchCountry)
      if (result) setAppleTrack(result)
      else setFallbackError('Song not available in your region')
    } catch (e) {
      setFallbackError('Song not available in your region')
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100)
    }
    audio.addEventListener('timeupdate', updateProgress)
    return () => audio.removeEventListener('timeupdate', updateProgress)
  }, [isPlaying])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // --- Layout Constants ---
  const PLAYER_HEIGHT = 200 // Fixed height for both PC and H5

  if (!isChinaDetails.checked) {
    return (
      <div className="w-full rounded-2xl animate-pulse" style={{ height: PLAYER_HEIGHT, backgroundColor: '#282828' }} />
    )
  }

  // Common UI Wrapper
  const PlayerCard = ({ children, color }: { children: React.ReactNode, color: string }) => (
    <div
      className="w-full md:w-[600px] mx-auto rounded-[16px] overflow-hidden shadow-2xl relative transition-all duration-700"
      style={{
        width: '100%',
        maxWidth: '600px',
        height: `${PLAYER_HEIGHT}px`,
        backgroundColor: color,
        background: `linear-gradient(135deg, ${color} 0%, ${color}EE 100%)`
      }}
    >
      {children}
    </div>
  )

  // Apple Music or Spotify Preview UI (Matching the Niall Horan image)
  const CustomPlayerUI = ({
    imageUrl, title, artist, durationMs, externalUrl, provider
  }: {
    imageUrl: string, title: string, artist: string, durationMs: number, externalUrl: string, provider: 'spotify' | 'apple'
  }) => (
    <PlayerCard color={dominantColor}>
      <div className="flex h-full p-5 relative text-white">
        {/* Left: Artwork (160x160) - FORCED PHYSICAL SIZE */}
        <div
          className="flex-shrink-0 my-auto overflow-hidden rounded-[12px] shadow-lg border border-white/10"
          style={{ width: '160px', height: '160px', minWidth: '160px', minHeight: '160px' }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="object-cover"
            style={{ width: '160px', height: '160px' }}
          />
        </div>

        {/* Right Info: Title/Artist (Top Aligned, 20px gap) */}
        <div className="flex-1 pl-5 flex flex-col justify-start mt-0 min-w-0">
          <h3 className="text-2xl md:text-[32px] font-bold truncate tracking-tight mb-0.5 leading-tight">
            {title}
          </h3>
          <p className="text-white/70 text-lg font-medium truncate mb-6">
            {artist}
          </p>

          <button
            onClick={() => window.open(externalUrl, '_blank')}
            className="flex items-center gap-2.5 group/save w-fit"
          >
            <div className="w-7 h-7 rounded-full border-2 border-white/60 flex items-center justify-center group-hover/save:border-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span className="text-base font-semibold text-white/90 group-hover/save:text-white transition-colors">
              在 {provider === 'spotify' ? 'Spotify' : 'Apple Music'} 上打开
            </span>
          </button>
        </div>

        {/* Top Right: Brand Logo */}
        <div className="absolute top-5 right-5 opacity-90">
          {provider === 'spotify' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.485 17.306c-.215.352-.676.463-1.028.248-2.857-1.745-6.45-2.14-10.686-1.171-.403.092-.806-.16-.898-.563-.092-.403.16-.806.563-.898 4.675-1.07 8.647-.611 11.796 1.313.352.215.463.676.248 1.028zm1.467-3.264c-.269.439-.844.582-1.283.313-3.27-2.01-8.254-2.595-12.122-1.417-.492.15-1.018-.128-1.168-.621-.15-.493.128-1.018.621-1.168 4.417-1.34 9.93-.679 13.639 1.6 0 .001.44.27.313 1.306zm.127-3.374c-.322.525-1.01.693-1.535.37-3.826-2.272-10.134-2.483-13.844-1.357-.6.183-1.237-.16-1.42-.761-.183-.601.16-1.238.761-1.42 4.316-1.311 11.278-1.066 15.679 1.547.525.323.693 1.01.37 1.535z" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.96.95-2.56 1.13-4.42 1.13a23.1 23.1 0 0 1-5.63-.64c-1.34-.33-2.61-.91-2.61-2.31 0-1.16.89-1.92 2.37-2.3a16.5 16.5 0 0 1 5.39-.77c2.03 0 3.8.32 4.9.9.46.25.75.54.75.99 0 .45-.29.75-.75.99-.96.95-2.56 1.13-4.42 1.13-.53 0-1.07-.02-1.61-.06-.54-.04-.54-.86 0-.82 2.03 0 3.8-.32 4.9-.9.46-.25.75-.54.75-.99 0-.45-.29-.75-.75-.99-.34-.18-.83-.34-1.42-.47v4.11c0 .44.18.86.5 1.18l.34.33zM12 3v13.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5V3c0-.28.22-.5.5-.5s.5.22.5.5z" /></svg>
          )}
        </div>

        {/* Bottom Area: Progress & Controls (Left offset 200px) */}
        <div className="absolute bottom-5 left-4 right-4 md:left-[200px] md:right-6">
          <div className="flex items-center gap-5">
            {/* Progress Bar Container */}
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 bg-white/20 rounded-full h-[4px] relative group/progress cursor-pointer">
                <div
                  className="bg-white/80 h-full rounded-full relative"
                  style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }} />
              </div>
              <span className="text-sm font-bold tabular-nums text-white/90 min-w-[40px] text-right">
                {formatTime((durationMs || 30000) * (progress / 100))}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-5 md:gap-6">
              <button className="text-white/60 hover:text-white transition-all">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="6" height="16"></rect><rect x="12" y="4" width="6" height="16"></rect></svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M7 4v16l14-8z"></path></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlayerCard>
  )

  // 1. Spotify Global (If not China)
  if (!isChinaDetails.isChina) {
    // We use the custom UI for consistency if we have a preview_url
    // Otherwise we might still use the iframe, but the user asked for a specific style.
    // Spotify iframe is hard to style. Let's try to simulate the look with our custom UI first,
    // and if they want the real iframe we can switch back. 
    // Usually, we prefer the CUSTOM consistency.

    // BUT! Spotify embeds are powerful. If it's global, let's keep the IFRAME for full functionality
    // but Wrap it in our fixed height container.
    return (
      <div
        key={`spotify-${track.id}`}
        className="w-full rounded-2xl overflow-hidden shadow-sm md:aspect-[3/1]"
        style={{ height: PLAYER_HEIGHT }}
      >
        <iframe
          src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
          width="100%"
          height={PLAYER_HEIGHT}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block"
          style={{ minHeight: PLAYER_HEIGHT }}
        ></iframe>
      </div>
    )
  }

  // 2. China Logic -> Apple Music UI
  if (appleTrack) {
    return (
      <>
        <CustomPlayerUI
          imageUrl={appleTrack.artworkUrl100?.replace('100x100', '600x600')}
          title={appleTrack.trackName}
          artist={appleTrack.artistName}
          durationMs={30000} // Preview length
          externalUrl={appleTrack.trackViewUrl}
          provider="apple"
        />
        <audio
          ref={audioRef}
          src={appleTrack.previewUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </>
    )
  }

  // Fallback / Loading
  return (
    <div
      className="w-full h-[180px] bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-black/5 p-4 text-center"
      style={{ height: PLAYER_HEIGHT }}
    >
      {fallbackError ? (
        <>
          <p className="text-sm text-gray-400">🚫 {fallbackError}</p>
          <button
            onClick={() => setIsChinaDetails({ isChina: false, checked: true })}
            className="text-[10px] mt-2 underline opacity-60"
          >
            Force Spotify
          </button>
        </>
      ) : (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 opacity-30" />
      )}
    </div>
  )
}