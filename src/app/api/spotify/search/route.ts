import { NextRequest, NextResponse } from 'next/server'
import { spotifyService } from '@/lib/spotify'

// iTunes API Search -> SpotifyTrack mapping
async function searchAppleMusicFallback(query: string, limit: number = 10) {
  try {
    const term = encodeURIComponent(query)
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=${limit}&country=US`
    
    console.log('🎵 [Fallback Search] Searching Apple Music:', query)
    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) return []
    
    const data = await response.json()
    if (!data.results) return []

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
        spotify: track.trackViewUrl // Mapping itunes url to external_urls
      }
    }))
  } catch (e) {
    console.error('Apple Music Fallback Failed:', e)
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    const tracks = await spotifyService.searchTracks(query, 10)
    return NextResponse.json({ tracks })
  } catch (error: any) {
    console.warn('⚠️ Spotify Search failed, trying Apple Music fallback...', error.message)
    
    // Fallback to Apple Music
    const tracks = await searchAppleMusicFallback(query, 10)
    
    if (tracks && tracks.length > 0) {
      console.log('✅ Fallback success: Found', tracks.length, 'tracks from Apple Music')
      return NextResponse.json({ 
        tracks, 
        isFallback: true,
        source: 'Apple Music'
      })
    }

    // If even fallback fails, return the original error
    let status = 500
    const statusMatch = error.message?.match(/\((\d{3})\)/)
    if (statusMatch) status = parseInt(statusMatch[1])

    return NextResponse.json({
      error: 'Failed to search tracks',
      details: error.message || 'Unknown backend error',
      timestamp: new Date().toISOString()
    }, { status })
  }
}