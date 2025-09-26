import { NextResponse } from 'next/server'
import { letterService } from '@/lib/letterService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const popularArtists = await letterService.getPopularArtists(limit)

    return NextResponse.json(popularArtists)
  } catch (error) {
    console.error('Error fetching popular artists:', error)
    return NextResponse.json({ error: 'Failed to fetch popular artists' }, { status: 500 })
  }
}