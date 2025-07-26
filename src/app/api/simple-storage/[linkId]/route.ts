import { NextRequest, NextResponse } from 'next/server'
import { Letter } from '@/lib/supabase'
import { ServerLetterStorage } from '@/lib/serverStorage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    
    const letter = ServerLetterStorage.get(linkId)
    
    if (letter) {
      return NextResponse.json(letter)
    } else {
      return NextResponse.json(
        { error: 'Letter not found', linkId },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const letterData = await request.json()
    
    const letter: Letter = {
      ...letterData,
      link_id: linkId,
      created_at: letterData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    ServerLetterStorage.save(linkId, letter)
    
    return NextResponse.json(letter)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    )
  }
}