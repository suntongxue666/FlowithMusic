'use client'

import { useState, useEffect } from 'react'
import { SpotifyTrack } from '@/lib/spotify'
import { ColorExtractor } from '@/lib/colorExtractor'

interface ColorfulSpotifyPlayerProps {
  track: SpotifyTrack
}

export default function ColorfulSpotifyPlayer({ track }: ColorfulSpotifyPlayerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [dominantColor, setDominantColor] = useState('#1DB954')
  const [gradient, setGradient] = useState('linear-gradient(135deg, #1DB954, #1ED760)')
  const [textColor, setTextColor] = useState('#ffffff')

  useEffect(() => {
    // 检测设备和浏览器
    const userAgent = navigator.userAgent
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(userAgent) || /iPhone|iPad|iPod/i.test(userAgent)
    
    setIsMobile(isMobileDevice)
    setIsSafari(isSafariBrowser)
    
    // 每次track变化时重置状态
    setIframeLoaded(false)
    setShowFallback(false)
  }, [track])

  useEffect(() => {
    // H5环境下延迟检查iframe是否加载成功
    if (isMobile && !showFallback && !iframeLoaded) {
      const timer = setTimeout(() => {
        console.log('⚠️ H5 iframe timeout, showing fallback')
        setShowFallback(true)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isMobile, showFallback, iframeLoaded])

  useEffect(() => {
    // 提取专辑封面的主色调
    const extractColor = async () => {
      if (track.album.images[0]?.url) {
        try {
          const color = await ColorExtractor.extractDominantColor(track.album.images[0].url)
          setDominantColor(color)
          setGradient(ColorExtractor.generateGradient(color))
          setTextColor(ColorExtractor.getContrastTextColor(color))
        } catch (error) {
          console.error('Color extraction failed:', error)
          // 使用默认颜色
        }
      }
    }

    extractColor()
  }, [track.album.images])

  // Extract track ID from Spotify URL or use the ID directly
  const getTrackId = (track: SpotifyTrack): string => {
    // If track.id is already a Spotify track ID, use it
    if (track.id && !track.id.includes('/')) {
      return track.id
    }
    
    // Extract from Spotify URL if needed
    const spotifyUrl = track.external_urls?.spotify
    if (spotifyUrl) {
      const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)
      if (match) {
        return match[1]
      }
    }
    
    // Fallback to track.id
    return track.id
  }

  const trackId = getTrackId(track)
  
  // Safari移动端的embed URL，添加特殊参数以确保播放功能
  const embedUrl = isSafari && isMobile 
    ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&autoplay=0&show_info=1`
    : `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`

  const handleIframeError = () => {
    setShowFallback(true)
  }

  const openInSpotify = () => {
    window.open(track.external_urls?.spotify, '_blank', 'noopener,noreferrer')
  }

  if (showFallback) {
    return (
      <div className="colorful-spotify-container">
        <div 
          className="colorful-spotify-fallback"
          style={{ 
            background: gradient,
            color: textColor
          }}
        >
          <div className="colorful-fallback-content">
            <img 
              src={track.album.images[0]?.url} 
              alt={track.album.name}
              className="colorful-fallback-cover"
            />
            <div className="colorful-fallback-info">
              <div className="colorful-track-name">{track.name}</div>
              <div className="colorful-track-artist">{track.artists[0]?.name}</div>
            </div>
            <button 
              className="colorful-spotify-btn"
              onClick={openInSpotify}
              style={{
                backgroundColor: `rgba(${textColor === '#ffffff' ? '255,255,255' : '0,0,0'}, 0.2)`,
                color: textColor,
                border: `1px solid rgba(${textColor === '#ffffff' ? '255,255,255' : '0,0,0'}, 0.3)`
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              在Spotify中播放
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="colorful-spotify-container">
      <div className="colorful-iframe-wrapper">
        <iframe
          style={{ borderRadius: '12px' }}
          src={embedUrl}
          width="100%"
          height="152"
          frameBorder="0"
          allowTransparency={true}
          allow="encrypted-media"
          title={`${track.name} by ${track.artists[0]?.name}`}
          onError={handleIframeError}
          onLoad={() => {
            // 确保H5端也能正常加载Spotify播放器
            console.log('✅ Spotify player loaded successfully')
            setIframeLoaded(true)
          }}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
      </div>
    </div>
  )
}