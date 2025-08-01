import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { linkId } = await request.json()
    
    if (!linkId) {
      return NextResponse.json({ error: 'linkId is required' }, { status: 400 })
    }
    
    // 设置强制刷新的响应头
    const response = NextResponse.json({
      success: true,
      message: `Cache cleared for letter ${linkId}`,
      timestamp: new Date().toISOString(),
      instructions: [
        'Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)',
        'Clear browser cache',
        'Check in incognito/private mode',
        'Wait a few minutes for CDN cache to expire'
      ]
    })
    
    // 添加缓存控制头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}