interface SpotifyTrack {
  id: string
  name: string
  duration_ms: number
  artists: Array<{
    name: string
  }>
  album: {
    name: string
    images: Array<{
      url: string
    }>
  }
  preview_url: string | null
  external_urls: {
    spotify: string
  }
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[]
  }
}

class SpotifyService {
  private accessToken: string | null = null
  private tokenExpires: number = 0
  private searchCache: Map<string, { data: SpotifyTrack[], timestamp: number }> = new Map()

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpires) {
      return this.accessToken
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    console.log(`[Spotify] Requesting token with ID: ${clientId?.slice(0, 4)}...`);

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        const message = errorJson.error_description || errorJson.error || errorText
        console.error('❌ Spotify: Token request failed:', response.status, message)
        throw new Error(`Spotify Auth Error (${response.status}): ${message}`)
      } catch (e) {
        console.error('❌ Spotify: Token request failed (text):', response.status, errorText)
        throw new Error(`Spotify Auth Error (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer

    console.log('[Spotify] Token refreshed successfully');
    return this.accessToken!
  }

  async searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
    const cacheKey = `${query}-${limit}`
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      console.log(`[Spotify] Returning cached results for: ${query}`)
      return cached.data
    }

    const token = await this.getAccessToken()

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        const message = errorJson.error?.message || errorJson.message || errorText
        console.error('❌ Spotify: Search request failed:', response.status, message)
        throw new Error(`Spotify Search Error (${response.status}): ${message}`)
      } catch (e) {
        console.error('❌ Spotify: Search request failed (text):', response.status, errorText)
        throw new Error(`Spotify Search Error (${response.status}): ${errorText}`)
      }
    }

    const data: SpotifySearchResponse = await response.json()
    const tracks = data.tracks?.items || []
    
    // Cache the results
    this.searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() })
    
    return tracks
  }

  async getRecommendations(limit: number = 10): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken()

    // Use popular seed genres and artists for recommendations
    const seedGenres = 'pop,rock,indie,electronic,hip-hop'

    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}&limit=${limit}&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Spotify: Recommendations request failed:', response.status, errorText)
      throw new Error(`Failed to get recommendations: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.tracks || []
  }
}

export const spotifyService = new SpotifyService()
export type { SpotifyTrack }