'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { letterService } from '@/lib/letterService'

export default function TestAuthPage() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [anonymousId, setAnonymousId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    const initTest = async () => {
      try {
        const anonId = await userService.initializeUser()
        setAnonymousId(anonId)

        const currentUser = userService.getCurrentUser()
        setUserInfo(currentUser)

        setTestResult('用户初始化成功')
      } catch (error) {
        setTestResult(`初始化失败: ${error}`)
      }
    }

    initTest()
  }, [])

  const testCreateLetter = async () => {
    try {
      const letter = await letterService.createLetter({
        to: 'Test Recipient',
        message: 'This is a test message',
        song: {
          id: 'test-song-id',
          title: 'Test Song',
          artist: 'Test Artist',
          albumCover: 'https://via.placeholder.com/300',
          spotifyUrl: 'https://open.spotify.com/track/test',
          duration_ms: 180000
        }
      })

      setTestResult(`Letter创建成功: ${letter.link_id}`)
    } catch (error) {
      setTestResult(`Letter创建失败: ${error}`)
    }
  }

  const testGoogleLogin = async () => {
    try {
      await userService.signInWithGoogle()
      setTestResult('Google登录请求已发送')
    } catch (error) {
      setTestResult(`Google登录失败: ${error}`)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>认证测试页面</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>用户状态</h3>
        <p><strong>匿名ID:</strong> {anonymousId}</p>
        <p><strong>已登录用户:</strong> {userInfo ? userInfo.email : '未登录'}</p>
        <p><strong>测试结果:</strong> {testResult}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={testCreateLetter}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          测试创建Letter
        </button>

        <button
          onClick={testGoogleLogin}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          测试Google登录
        </button>

        <button
          onClick={() => window.location.href = '/history'}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          返回历史页面
        </button>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p>这个页面用于测试认证功能是否正常工作。</p>
        <p>1. 检查匿名用户ID是否正确生成</p>
        <p>2. 测试Letter创建是否能正确关联用户</p>
        <p>3. 测试Google登录流程</p>
      </div>
    </div>
  )
}