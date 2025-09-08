'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'

export default function TestSocialMediaFixPage() {
  const [user, setUser] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = () => {
    const currentUser = userService.getCurrentUser()
    setUser(currentUser)
    console.log('当前用户状态:', currentUser)
  }

  const testAPI = async (method: string, endpoint: string, description: string) => {
    setLoading(true)
    try {
      console.log(`🔍 ${description}...`)
      
      const options: RequestInit = { 
        method, 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
      
      const response = await fetch(endpoint, options)
      const data = await response.json()
      
      console.log(`✅ ${description}结果:`, data)
      setResult({ 
        method, 
        endpoint, 
        description, 
        status: response.status, 
        data 
      })
      
    } catch (error) {
      console.error(`❌ ${description}失败:`, error)
      setResult({ 
        method, 
        endpoint, 
        description, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  const fixUserID = async () => {
    setLoading(true)
    try {
      console.log('🔧 开始修复用户ID...')
      
      // 强制重新获取用户数据
      await userService.cleanupCorruptedSession()
      const updatedUser = await userService.fetchAndCacheUser()
      
      if (updatedUser) {
        setUser(updatedUser)
        console.log('✅ 用户ID修复成功:', updatedUser.id)
        setResult({ 
          action: '修复用户ID',
          success: true, 
          user: updatedUser 
        })
      } else {
        console.log('⚠️ 从数据库获取失败，检查localStorage...')
        const currentUser = userService.getCurrentUser()
        setUser(currentUser)
        setResult({ 
          action: '修复用户ID',
          success: !!currentUser?.id,
          user: currentUser 
        })
      }
      
    } catch (error) {
      console.error('❌ 修复失败:', error)
      setResult({ 
        action: '修复用户ID',
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  const testDirectSave = async () => {
    setLoading(true)
    try {
      console.log('🧪 测试直接保存社交媒体...')
      
      const result = await userService.updateSocialMedia({
        whatsapp: '+1234567890-direct'
      })
      
      console.log('✅ 直接保存成功:', result)
      setUser(result)
      setResult({ 
        action: '直接保存测试',
        success: true, 
        user: result 
      })
      
    } catch (error) {
      console.error('❌ 直接保存失败:', error)
      setResult({ 
        action: '直接保存测试',
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>🔧 社交媒体修复测试</h1>
      
      {/* 用户状态显示 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>当前用户状态</h2>
        {user ? (
          <div>
            <p><strong>✅ 邮箱:</strong> {user.email}</p>
            <p><strong>✅ 用户ID:</strong> {user.id || '❌ 缺失'}</p>
            <p><strong>✅ Google ID:</strong> {user.google_id || '❌ 缺失'}</p>
            <p><strong>✅ 显示名:</strong> {user.display_name}</p>
            <p><strong>📱 社交媒体字段数:</strong> {user.social_media_info ? Object.keys(user.social_media_info).length : 0}</p>
            {user.social_media_info && Object.keys(user.social_media_info).length > 0 && (
              <details style={{ marginTop: '10px' }}>
                <summary>显示社交媒体内容</summary>
                <pre style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginTop: '8px'
                }}>
                  {JSON.stringify(user.social_media_info, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <p style={{ color: 'red' }}>❌ 用户未登录</p>
        )}
        
        <button 
          onClick={checkUserStatus} 
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 刷新状态
        </button>
      </div>

      {/* 操作按钮 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>修复操作</h2>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <button 
            onClick={fixUserID}
            disabled={loading}
            style={{ 
              padding: '12px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔧 修复中...' : '🔧 修复用户ID'}
          </button>
          
          <button 
            onClick={() => testAPI('GET', '/api/fix-social-media', '检查API数据状态')}
            disabled={loading}
            style={{ 
              padding: '12px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔍 检查中...' : '🔍 检查API状态'}
          </button>
          
          <button 
            onClick={() => testAPI('POST', '/api/fix-social-media', '清理污染数据')}
            disabled={loading}
            style={{ 
              padding: '12px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🧹 清理中...' : '🧹 清理污染数据'}
          </button>
          
          <button 
            onClick={testDirectSave}
            disabled={loading || !user?.id}
            style={{ 
              padding: '12px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: (loading || !user?.id) ? 'not-allowed' : 'pointer',
              opacity: (loading || !user?.id) ? 0.6 : 1
            }}
          >
            {loading ? '🧪 测试中...' : '🧪 直接保存测试'}
          </button>
        </div>
      </div>

      {/* 结果显示 */}
      {result && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>操作结果</h2>
          <div style={{ 
            backgroundColor: result.success === false ? '#f8d7da' : '#d4edda', 
            padding: '15px', 
            borderRadius: '4px',
            border: `1px solid ${result.success === false ? '#f5c6cb' : '#c3e6cb'}`
          }}>
            <pre style={{ 
              fontSize: '12px', 
              margin: 0, 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}