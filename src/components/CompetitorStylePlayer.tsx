'use client'

import { SpotifyTrack } from '@/lib/spotify'

interface CompetitorStylePlayerProps {
  track: SpotifyTrack
}

export default function CompetitorStylePlayer({ track }: CompetitorStylePlayerProps) {
  // Extract track ID from Spotify URL or use the ID directly
  const getTrackId = (track: SpotifyTrack): string => {
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
    
    return track.id
  }

  const trackId = getTrackId(track)
  
  // Different embed URL patterns that competitors might use
  const embedUrls = {
    // Standard compact player
    compact: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`,
    
    // Large player with full controls
    full: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=coverart&t=0`,
    
    // Alternative format that some sites use
    alternative: `https://open.spotify.com/embed/track/${trackId}?utm_source=oembed&utm_medium=desktop&utm_campaign=organic`,
    
    // With additional permissions
    enhanced: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=coverart&t=0&autoplay=1&show_artwork=true`
  }

  return (
    <div className="competitor-player-container">
      {/* 主播放器 - 使用竞品可能采用的大尺寸播放器 */}
      <div className="main-player">
        <iframe
          style={{ borderRadius: '12px' }}
          src={embedUrls.enhanced}
          width="100%"
          height="380"
          frameBorder="0"
          allowTransparency={true}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`${track.name} by ${track.artists[0]?.name}`}
        />
      </div>

      {/* 备用播放器 - 如果主播放器不工作 */}
      <div className="fallback-player" style={{ display: 'none' }}>
        <iframe
          style={{ borderRadius: '12px' }}
          src={embedUrls.full}
          width="100%"
          height="352"
          frameBorder="0"
          allowTransparency={true}
          allow="encrypted-media; fullscreen"
          loading="lazy"
          title={`${track.name} by ${track.artists[0]?.name} (Fallback)`}
        />
      </div>

      {/* 直接Spotify链接作为最后备用方案 */}
      <div className="spotify-link-container">
        <a 
          href={track.external_urls?.spotify} 
          target="_blank" 
          rel="noopener noreferrer"
          className="open-spotify-btn"
        >
          <img 
            src="https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico" 
            alt="Spotify" 
            width="16" 
            height="16"
          />
          在 Spotify 中打开
        </a>
      </div>
    </div>
  )
}