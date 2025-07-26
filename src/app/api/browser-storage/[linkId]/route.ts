import { NextRequest, NextResponse } from 'next/server'

// 这个API端点将指导客户端使用localStorage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  
  // 返回指令让客户端检查localStorage
  return NextResponse.json({
    instruction: 'check_localStorage',
    linkId,
    message: 'Please check localStorage for this letter'
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  const letterData = await request.json()
  
  // 返回指令让客户端保存到localStorage
  return NextResponse.json({
    instruction: 'save_to_localStorage',
    linkId,
    letter: letterData,
    message: 'Please save this letter to localStorage'
  })
}