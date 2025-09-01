'use client'

import { useState } from 'react'
import { useUserState } from '@/hooks/useUserState'

export default function DebugUserIdPage() {
  const [result, setResult] = useState<string>('')
  const { user, isAuthenticated } = useUserState()

  const checkUserData = () => {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      hookData: {
        user: user,
        isAuthenticated: isAuthenticated,
        userId: user?.id,
        userEmail: user?.email
      },
      localStorage: {}
    }

    try {
      // 检查localStorage中的用户数据
      const localUser = localStorage.getItem('user')
      const localAuth = localStorage.getItem('isAuthenticated')
      
      if (localUser) {
        const parsedUser = JSON.parse(localUser)
        debugInfo.localStorage = {
          raw: localUser,
          parsed: parsedUser,
          hasId: !!parsedUser.id,
          hasEmail: !!parsedUser.email,
          allKeys: Object.keys(parsedUser)
        }
      }
      
      // 检查letters数据
      const letters = JSON.parse(localStorage.getItem('letters') || '[]')
      debugInfo.letters = {
        count: letters.length,
        sampleLetters: letters.slice(0, 3).map((l: any) => ({
          id: l.id,
          user_id: l.user_id,
          anonymous_id: l.anonymous_id,
          recipient_name: l.recipient_name
        }))
      }
      
    } catch (error) {
      debugInfo.error = error
    }
    
    setResult(JSON.stringify(debugInfo, null, 2))
    console.log('📊 用户ID调试信息:', debugInfo)
  }

  const fixUserId = () => {
    try {
      const localUser = localStorage.getItem('user')
      if (localUser) {
        const parsedUser = JSON.parse(localUser)
        
        // 如果用户对象没有id字段，尝试从其他字段获取
        if (!parsedUser.id) {
          // 尝试从google_id获取
          if (parsedUser.google_id) {
            parsedUser.id = parsedUser.google_id
            console.log('🔧 从google_id修复用户ID:', parsedUser.id)
          }
          // 或者生成一个临时ID
          else {
            parsedUser.id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
            console.log('🔧 生成临时用户ID:', parsedUser.id)
          }
          
          // 保存修复后的用户数据
          localStorage.setItem('user', JSON.stringify(parsedUser))
          setResult(`✅ 用户ID已修复: ${parsedUser.id}`)
          
          // 刷新页面以应用更改
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          setResult(`ℹ️ 用户ID已存在: ${parsedUser.id}`)
        }
      } else {
        setResult('❌ localStorage中没有用户数据')
      }
    } catch (error) {
      setResult(`❌ 修复失败: ${error}`)
    }
  }

  const addTestLetters = () => {
    try {
      const localUser = localStorage.getItem('user')
      if (!localUser) {
        setResult('❌ 请先修复用户ID')
        return
      }
      
      const parsedUser = JSON.parse(localUser)
      if (!parsedUser.id) {
        setResult('❌ 用户ID仍然为空，请先修复')
        return
      }
      
      const testLetters = [
        {
          id: `letter-${Date.now()}-1`,
          link_id: `link-${Date.now()}-1`,
          user_id: parsedUser.id, // 使用正确的用户ID
          anonymous_id: null,
          recipient_name: 'Test Friend 1',
          song_title: 'Test Song 1',
          song_artist: 'Test Artist 1',
          song_album_cover: 'https://via.placeholder.com/300x300',
          message: 'This is a test letter with correct user_id matching',
          view_count: 0,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: `letter-${Date.now()}-2`,
          link_id: `link-${Date.now()}-2`,
          user_id: parsedUser.id, // 使用正确的用户ID
          anonymous_id: null,
          recipient_name: 'Test Friend 2',
          song_title: 'Test Song 2',
          song_artist: 'Test Artist 2',
          song_album_cover: 'https://via.placeholder.com/300x300',
          message: 'Another test letter with matching user_id',
          view_count: 0,
          is_public: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      // 保存到localStorage
      localStorage.setItem('letters', JSON.stringify(testLetters))
      
      setResult(`✅ 已添加${testLetters.length}个测试letters，user_id: ${parsedUser.id}`)
      console.log('✅ 添加的测试letters:', testLetters)
      
    } catch (error) {
      setResult(`❌ 添加测试letters失败: ${error}`)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 用户ID调试页面</h1>
      <p>调试userId为undefined导致letters无法显示的问题</p>
      
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
        <h3>当前状态</h3>
        <p><strong>用户邮箱:</strong> {user?.email || 'undefined'}</p>
        <p><strong>用户ID:</strong> {user?.id || 'undefined'}</p>
        <p><strong>认证状态:</strong> {isAuthenticated ? '已登录' : '未登录'}</p>
      </div>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={checkUserData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔍 检查用户数据
        </button>
        
        <button 
          onClick={fixUserId}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔧 修复用户ID
        </button>
        
        <button 
          onClick={addTestLetters}
          style={{
            padding: '12px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ➕ 添加测试Letters
        </button>
      </div>
      
      {result && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginTop: '1rem'
        }}>
          <h3>📊 调试结果</h3>
          <pre style={{ 
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            whiteSpace: 'pre-wrap'
          }}>
            {result}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h4>📋 修复步骤</h4>
        <ol>
          <li><strong>检查用户数据</strong>：查看localStorage中的用户对象结构</li>
          <li><strong>修复用户ID</strong>：如果id字段为空，从google_id获取或生成</li>
          <li><strong>添加测试Letters</strong>：创建与用户ID匹配的测试letters</li>
          <li><strong>访问History页面</strong>：验证letters是否正确显示</li>
        </ol>
      </div>
    </div>
  )
}