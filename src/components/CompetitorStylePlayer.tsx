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
      {/* 横向大播放器 */}
      <div className="main-player">
        <iframe
          style={{ borderRadius: '12px' }}
          src={embedUrls.compact}
          width="100%"
          height="152"
          frameBorder="0"
          allowTransparency={true}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`${track.name} by ${track.artists[0]?.name}`}
        />
      </div>
    </div>
  )
}