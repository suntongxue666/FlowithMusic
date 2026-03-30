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
  forceRefresh?: number  // 添加强制刷新属性
}

export default function ColorfulSpotifyPlayer({ track, countryCode: initialCountryCode, forceRefresh }: ColorfulSpotifyPlayerProps) {
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
      ? appleTrack.artworkUrl100?.replace('100x100', '120x120')
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
    // If the track is already an Apple Music track, skip detection
    if (track.id.startsWith('apple-')) {
      console.log('📍 Track is already Apple Music - Skipping detection');
      setIsChinaDetails({ isChina: true, checked: true });
      
      // Extract original ID and set as appleTrack if possible
      // Or just rely on the track object itself being populated
      setAppleTrack({
        trackName: track.name,
        artistName: track.artists[0]?.name,
        previewUrl: track.preview_url || '',
        artworkUrl100: track.album.images[0]?.url || '',
        trackViewUrl: track.external_urls.spotify, // it was mapped to this in the fallback
        trackTimeMillis: track.duration_ms || 30000
      });
      return;
    }

    async function checkIn() {
      try {
        // 为 IP 检测留出足够时间，特别是在中国慢速网络环境下
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 6000)
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
        // 超时或失败时，直接回退到 Global (Spotify)
        console.log('⏱️ Detection failure or timeout. Using Global.', e)
        setIsChinaDetails({ isChina: false, checked: true })
      }
    }
    checkIn()
  }, [track.id, forceRefresh])

  const fetchAppleMusicFallback = async (isCN: boolean) => {
    try {
      if (!track || !track.artists?.[0]) return
      console.log('🎵 Fetching Apple Music for:', track.name, track.artists[0].name)

      // 延长超时到10秒，特别针对移动端/H5复杂网络环境
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Apple Music search timeout')), 10000)
      )

      // 先尝试中国区 Apple Music，如果搜不到再尝试美国区
      let result = await Promise.race([
        searchAppleMusic(track.name, track.artists[0]?.name || '', track.duration_ms, 'CN'),
        timeoutPromise
      ])

      if (!result) {
        console.log('🎵 Apple Music [CN] not found, trying multi-region search...')
        // 依次尝试不同地区
        const regions = ['US', 'HK', 'TW']
        for (const region of regions) {
          result = await Promise.race([
            searchAppleMusic(track.name, track.artists[0]?.name || '', track.duration_ms, region),
            timeoutPromise
          ])
          if (result) break
        }
      }

      if (result) {
        console.log('🎵 Apple Music tracked successfully:', result.trackName, '| Cover URL:', result.artworkUrl100)
        setAppleTrack(result)
      } else {
        console.log('🎵 Apple Music API returned no matching results. Track is truly missing.')
        setFallbackError('Apple Music search failed for this track.')
      }
    } catch (e) {
      console.error('🎵 Apple Music fetch error:', e)
      setFallbackError('Apple Music connection failed.')
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
    if (!ms || isNaN(ms)) return '0:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // --- Layout Constants ---
  const PLAYER_HEIGHT = 152 // Fixed height for both PC and H5, matches Spotify embed standard

  if (!isChinaDetails.checked) {
    return (
      <div className="w-full rounded-2xl animate-pulse" style={{ height: PLAYER_HEIGHT, backgroundColor: '#282828' }} />
    )
  }

  // Common UI Wrapper
  const PlayerCard = ({ children, color }: { children: React.ReactNode, color: string }) => (
    <div
      className="w-full max-w-[600px] mx-auto rounded-[16px] overflow-hidden shadow-2xl relative transition-all duration-700"
      style={{
        height: `${PLAYER_HEIGHT}px`,
        backgroundColor: color || '#282828'
      }}
    >
      {/* Background with Gaussian Blur for premium aesthetic */}
      <div 
        className="absolute inset-0 opacity-40 blur-[40px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20%, ${color} 0%, transparent 70%), 
                       radial-gradient(circle at 80%, ${color} 0%, transparent 70%)`
        }}
      />
      <div className="relative h-full">
        {children}
      </div>
    </div>
  )

  const CustomPlayerUI = ({
    imageUrl, title, artist, durationMs, externalUrl, provider
  }: {
    imageUrl: string, title: string, artist: string, durationMs: number, externalUrl: string, provider: 'spotify' | 'apple'
  }) => (
    <PlayerCard color={dominantColor}>
      <div className="flex h-full p-5 relative text-white">
        {/* Artwork Image Container (120x120, Shifted Left+Up 12px) */}
        <div
          className="flex-shrink-0 overflow-hidden rounded-[8px] md:rounded-[12px] shadow-lg border border-white/10"
          style={{
            width: '120px',
            height: '120px',
            minWidth: '120px',
            minHeight: '120px',
            marginLeft: '16px',
            marginTop: '20px'
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Right Content Container: Unified alignment (12px gap from cover) */}
        <div className="flex-1 flex flex-col min-w-0" style={{ marginTop: '20px', marginLeft: '12px' }}>
          {/* Top section: Title, Artist and Open Button */}
          <div className="flex flex-col mb-1 items-start">
            <h3 className="text-base md:text-[24px] font-bold truncate tracking-tight mb-0.5 leading-tight w-full">
              {title}
            </h3>
            <p className="text-white/70 text-sm md:text-base font-medium truncate mb-2 md:mb-4 w-full">
              {artist}
            </p>

            <button
              onClick={() => window.open(externalUrl, '_blank')}
              className="flex items-center gap-2.5 group/save w-fit ml-[-12px]"
            >
              <div className="w-5 h-5 rounded-full border-2 border-white/60 flex items-center justify-center group-hover/save:border-white transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </div>
              <span className="text-base font-semibold text-white/90 group-hover/save:text-white transition-colors whitespace-nowrap">
                在 {provider === 'spotify' ? 'Spotify' : 'Apple Music'} 上打开
              </span>
            </button>
          </div>

          {/* H5 Progress & Control Row: Fixed wrapping for time and progress bar */}
          <div className="md:hidden flex flex-col mt-auto mb-1 transform translate-y-[8px]">
            <div className="flex items-center gap-3 mr-2">
              <div className="flex flex-col">
                <div className="bg-white/20 rounded-full h-[3px] relative w-[120px]">
                  <div
                    className="bg-white/80 h-full rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-white/50 mt-1">
                  {formatTime((durationMs || 30000) * (progress / 100))}
                </span>
              </div>

              {/* H5 Play Button (48x48) shifted right of progress+time */}
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-2xl z-10 ml-auto"
              >
                {isPlaying ? (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="6" height="16"></rect><rect x="12" y="4" width="6" height="16"></rect></svg>
                ) : (
                  <svg className="w-7 h-7 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l14-8z"></path></svg>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Controls (Aligned with Title) */}
          <div className="hidden md:flex items-center gap-4 mt-auto mb-[-3px]">
            <div className="flex flex-1 items-center gap-3" style={{ maxWidth: 'calc(100% - 140px)' }}>
              <div className="flex-1 bg-white/20 rounded-full h-[4px] relative group/progress cursor-pointer">
                <div
                  className="bg-white/80 h-full rounded-full relative"
                  style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }}
                />
                <div
                  className="w-4 h-4 bg-white rounded-full shadow-lg absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%) translateY(6px)' }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums text-white/90 min-w-[40px] text-right">
                {formatTime((durationMs || 30000) * (progress / 100))}
              </span>
            </div>

            <div className="flex items-center gap-6 mr-5 ml-auto">
              <button className="text-white/60 hover:text-white transition-all">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="6" height="16"></rect><rect x="12" y="4" width="6" height="16"></rect></svg>
                ) : (
                  <svg className="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l14-8z"></path></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {provider === 'spotify' && (
          <div className="absolute top-5 right-5 opacity-90">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.4 12-12S18.627 0 12 0zm5.485 17.306c-.215.352-.676.463-1.028.248-2.857-1.745-6.45-2.14-10.686-1.171-.403.092-.806-.16-.898-.563-.092-.403.16-.806.563-.898 4.675-1.07 8.647-.611 11.796 1.313.352.215.463.676.248 1.028zm1.467-3.264c-.269.439-.844.582-1.283.313-3.27-2.01-8.254-2.595-12.122-1.417-.492.15-1.018-.128-1.168-.621-.15-.493.128-1.018.621-1.168 4.417-1.34 9.93-.679 13.639 1.6 0 .001.44.27.313 1.306zm.127-3.374c-.322.525-1.01.693-1.535.37-3.826-2.272-10.134-2.483-13.844-1.357-.6.183-1.237-.16-1.42-.761-.183-.601.16-1.238.761-1.42 4.316-1.311 11.278-1.066 15.679 1.547.525.323.693 1.01.37 1.535z" /></svg>
          </div>
        )}
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
          imageUrl={appleTrack.artworkUrl100 ? appleTrack.artworkUrl100.replace('100x100', '120x120') : (track.album?.images?.[0]?.url || '')}
          title={appleTrack.trackName || track.name}
          artist={appleTrack.artistName || track.artists?.[0]?.name}
          durationMs={30000} // Preview length
          externalUrl={appleTrack.trackViewUrl || track.external_urls?.spotify || ''}
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
  // Optimized Fallback UI (Clearly visible status)
  return (
    <div
      className="w-full bg-[#1e1e1e] rounded-2xl flex flex-col items-center justify-center border border-white/5 p-6 text-center"
      style={{ height: PLAYER_HEIGHT }}
    >
      {fallbackError ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400 font-medium">🚫 {fallbackError}</p>
          <button
            onClick={() => setIsChinaDetails({ isChina: false, checked: true })}
            className="text-[10px] text-blue-400 hover:text-blue-300 underline mt-2"
          >
            Force Spotify Iframe
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-white/80 font-bold">正在切换音乐源...</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Searching Apple Music for your region</p>
          </div>
        </div>
      )}
    </div>
  )
}