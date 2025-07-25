'use client'

import { SpotifyTrack } from '@/lib/spotify'

interface SpotifyEmbedPlayerProps {
  track: SpotifyTrack
}

export default function SpotifyEmbedPlayer({ track }: SpotifyEmbedPlayerProps) {
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
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`

  return (
    <div className="spotify-embed-container">
      <iframe
        style={{ borderRadius: '12px' }}
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allowTransparency={true}
        allow="encrypted-media"
        title={`${track.name} by ${track.artists[0]?.name}`}
      />
    </div>
  )
}