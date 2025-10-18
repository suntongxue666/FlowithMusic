import { NextRequest, NextResponse } from 'next/server'

// 使用 Map 作为简单的内存存储，但会在应用重启时丢失数据
// 这是一个临时解决方案，理想情况下应该使用 Redis 或数据库
const sharedLetters = new Map<string, any>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    
    // 从共享存储获取
    if (sharedLetters.has(linkId)) {
      const letter = sharedLetters.get(linkId)
      console.log('Letter found in shared storage:', linkId)
      return NextResponse.json(letter)
    }
    
    // 返回404如果没找到
    return NextResponse.json(
      { 
        error: 'Letter not found',
        linkId,
        message: 'Letter not found in shared storage'
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('Browser storage API error:', error)
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
    
    // 保存到共享存储
    const letter = {
      ...letterData,
      link_id: linkId,
      created_at: letterData.created_at || new Date().toISOString(),
      shared_storage: true
    }
    
    sharedLetters.set(linkId, letter)
    console.log('Letter saved to shared storage:', linkId)
    
    return NextResponse.json({
      success: true,
      letter,
      message: 'Letter saved to shared storage'
    })
  } catch (error) {
    console.error('Browser storage API save error:', error)
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    )
  }
}

// 添加一个获取所有Letters的端点用于调试
export async function PUT(request: NextRequest) {
  try {
    // 返回所有存储的Letters的基本信息
    const lettersList = Array.from(sharedLetters.keys()).map(linkId => ({
      linkId,
      recipient: sharedLetters.get(linkId)?.recipient_name,
      created: sharedLetters.get(linkId)?.created_at
    }))
    
    return NextResponse.json({
      count: sharedLetters.size,
      letters: lettersList
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list letters' }, { status: 500 })
  }
}