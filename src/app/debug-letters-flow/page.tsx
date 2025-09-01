'use client'

import { useState, useEffect } from 'react'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { useUserState } from '@/hooks/useUserState'

export default function DebugLettersFlow() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [letters, setLetters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const { user, isAuthenticated, isLoading } = useUserState()

  const runDebug = async () => {
    setLoading(true)
    console.log('🔍 开始调试letters获取流程...')
    
    try {
      // 1. 检查用户状态
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      const anonymousId = userService.getAnonymousId()
      
      console.log('👤 用户状态检查:', {
        hookUser: user,
        hookAuth: isAuthenticated,
        hookLoading: isLoading,
        serviceUser: currentUser,
        serviceAuth: isAuth,
        anonymousId
      })
      
      // 2. 检查localStorage数据
      const localUser = localStorage.getItem('user')
      const localAuth = localStorage.getItem('isAuthenticated')
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      console.log('💾 localStorage数据:', {
        user: localUser ? JSON.parse(localUser) : null,
        isAuthenticated: localAuth,
        lettersCount: localLetters.length,
        letters: localLetters.map((l: any) => ({
          linkId: l.link_id,
          recipient: l.recipient_name,
          userId: l.user_id,
          anonymousId: l.anonymous_id,
          created: l.created_at
        }))
      })
      
      // 3. 直接调用getUserLetters
      console.log('📡 调用getUserLetters...')
      const userLetters = await letterService.getUserLetters(50, 0)
      
      console.log('✅ getUserLetters结果:', {
        count: userLetters.length,
        letters: userLetters.map(l => ({
          linkId: l.link_id,
          recipient: l.recipient_name,
          userId: l.user_id,
          anonymousId: l.anonymous_id,
          created: l.created_at,
          hasDbId: l.id && typeof l.id === 'string' && l.id.includes('-')
        }))
      })
      
      setLetters(userLetters)
      
      // 4. 汇总调试信息
      setDebugInfo({
        hookState: {
          user: user ? {
            id: user.id,
            email: user.email,
            display_name: user.display_name
          } : null,
          isAuthenticated,
          isLoading
        },
        serviceState: {
          user: currentUser ? {
            id: currentUser.id,
            email: currentUser.email,
            display_name: currentUser.display_name
          } : null,
          isAuthenticated: isAuth,
          anonymousId
        },
        localStorage: {
          user: localUser ? JSON.parse(localUser) : null,
          isAuthenticated: localAuth,
          lettersCount: localLetters.length
        },
        result: {
          lettersCount: userLetters.length,
          dataSource: userLetters.some(l => l.id && typeof l.id === 'string' && l.id.includes('-')) 
            ? '数据库' : 'localStorage'
        }
      })
      
    } catch (error) {
      console.error('❌ 调试过程出错:', error)
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 页面加载时自动运行一次调试
    if (!isLoading) {
      runDebug()
    }
  }, [isLoading])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Letters获取流程调试</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runDebug}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '调试中...' : '🔄 重新调试'}
        </button>
      </div>

      {Object.keys(debugInfo).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>📊 调试信息</h2>
          <pre style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #dee2e6'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <h2>📋 获取到的Letters ({letters.length})</h2>
        {letters.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            没有找到letters数据
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {letters.map((letter, index) => (
              <div key={index} style={{
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '1rem',
                background: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {letter.song_album_cover && (
                    <img 
                      src={letter.song_album_cover} 
                      alt={letter.song_title}
                      style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                    />
                  )}
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>
                      To: {letter.recipient_name}
                    </h3>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                      {letter.song_title} - {letter.song_artist}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                      {new Date(letter.created_at).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#007bff' }}>
                      数据源: {letter.id && typeof letter.id === 'string' && letter.id.includes('-') 
                        ? '📡 数据库' : '💾 localStorage'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}