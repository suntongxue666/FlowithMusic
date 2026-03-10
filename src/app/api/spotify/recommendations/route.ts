import { NextResponse } from 'next/server'
import { spotifyService } from '@/lib/spotify'

export async function GET() {
  try {
    const tracks = await spotifyService.getRecommendations(10)
    return NextResponse.json({ tracks })
  } catch (error: any) {
    console.error('Recommendations error backend:', error)
    return NextResponse.json({
      error: 'Failed to get recommendations',
      details: error.message || 'Unknown backend error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}