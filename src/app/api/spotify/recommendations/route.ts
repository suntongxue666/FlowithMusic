import { NextResponse } from 'next/server'
import { spotifyService } from '@/lib/spotify'

export async function GET() {
  try {
    const tracks = await spotifyService.getRecommendations(10)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}