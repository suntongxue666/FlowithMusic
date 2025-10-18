import { NextRequest, NextResponse } from 'next/server'
import { spotifyService } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const tracks = await spotifyService.searchTracks(query, 10)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search tracks' }, { status: 500 })
  }
}