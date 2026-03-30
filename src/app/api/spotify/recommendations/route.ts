import { NextResponse } from 'next/server'
import { spotifyService } from '@/lib/spotify'

async function getAppleMusicRecommendations() {
  try {
    // Search for some trending/popular content as "recommendations"
    const term = encodeURIComponent('popular hits 2024')
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=10&country=US`
    
    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) return []
    
    const data = await response.json()
    return data.results.map((track: any) => ({
      id: `apple-${track.trackId}`,
      name: track.trackName,
      duration_ms: track.trackTimeMillis,
      artists: [{ name: track.artistName }],
      album: {
        name: track.collectionName,
        images: [{ url: track.artworkUrl100.replace('100x100', '600x600') }]
      },
      preview_url: track.previewUrl,
      external_urls: {
        spotify: track.trackViewUrl
      }
    }))
  } catch (e) {
    return []
  }
}

export async function GET() {
  try {
    const tracks = await spotifyService.getRecommendations(10)
    return NextResponse.json({ tracks })
  } catch (error: any) {
    console.warn('⚠️ Spotify Recommendations failed, using Apple Music fallback')
    const tracks = await getAppleMusicRecommendations()
    
    if (tracks && tracks.length > 0) {
      return NextResponse.json({ 
        tracks,
        isFallback: true,
        source: 'Apple Music' 
      })
    }

    return NextResponse.json({
      error: 'Failed to get recommendations',
      details: error.message || 'Unknown backend error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}