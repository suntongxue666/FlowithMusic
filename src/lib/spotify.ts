interface SpotifyTrack {
  id: string
  name: string
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

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpires) {
      return this.accessToken
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured')
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      throw new Error('Failed to get Spotify access token')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer

    return this.accessToken!
  }

  async searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken()
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to search tracks')
    }

    const data: SpotifySearchResponse = await response.json()
    return data.tracks.items
  }

  async getRecommendations(limit: number = 10): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken()
    
    // Use popular seed genres and artists for recommendations
    const seedGenres = 'pop,rock,indie,electronic,hip-hop'
    
    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get recommendations')
    }

    const data = await response.json()
    return data.tracks
  }
}

export const spotifyService = new SpotifyService()
export type { SpotifyTrack }