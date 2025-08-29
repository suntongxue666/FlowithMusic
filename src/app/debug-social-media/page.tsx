'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'

export default function DebugSocialMediaPage() {
  const [user, setUser] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const currentUser = userService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const testSocialMediaSave = async () => {
    setLoading(true)
    try {
      console.log('🔍 开始测试社交媒体保存...')
      console.log('当前用户:', user)
      
      if (!user) {
        throw new Error('用户未登录')
      }

      // 测试保存WhatsApp
      const updatedUser = await userService.updateSocialMedia({
        whatsapp: '+1234567890'
      })
      
      console.log('✅ 保存成功:', updatedUser)
      setResult({ success: true, user: updatedUser })
      
      // 更新本地用户状态
      setUser(updatedUser)
      
    } catch (error) {
      console.error('❌ 保存失败:', error)
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentUser = () => {
    const currentUser = userService.getCurrentUser()
    console.log('当前用户状态:', currentUser)
    setUser(currentUser)
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-supabase')
      const data = await response.json()
      setResult({ type: 'database_test', data })
    } catch (error) {
      setResult({ type: 'database_test', error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>社交媒体保存调试</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>当前用户状态：</h3>
        {user ? (
          <div>
            <p><strong>邮箱:</strong> {user.email}</p>
            <p><strong>显示名:</strong> {user.display_name}</p>
            <p><strong>用户ID:</strong> {user.id}</p>
            <p><strong>积分:</strong> {user.coins}</p>
            <p><strong>社交媒体信息:</strong></p>
            <pre style={{ background: '#fff', padding: '0.5rem', borderRadius: '4px' }}>
              {JSON.stringify(user.social_media_info || {}, null, 2)}
            </pre>
          </div>
        ) : (
          <p style={{ color: 'red' }}>用户未登录</p>
        )}
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={checkCurrentUser} disabled={loading}>
          刷新用户状态
        </button>
        
        <button onClick={testSocialMediaSave} disabled={loading || !user}>
          测试保存WhatsApp (+1234567890)
        </button>
        
        <button onClick={testDatabaseConnection} disabled={loading}>
          测试数据库连接
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>测试结果：</h2>
          <div style={{ 
            background: result.success === false ? '#fee' : '#efe', 
            padding: '1rem', 
            borderRadius: '4px',
            border: `1px solid ${result.success === false ? '#fcc' : '#cfc'}`
          }}>
            <pre style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '1rem', 
              borderRadius: '4px', 
              overflow: 'auto'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}