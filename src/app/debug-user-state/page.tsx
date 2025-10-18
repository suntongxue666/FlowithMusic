'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'

export default function DebugUserStatePage() {
  const [stateInfo, setStateInfo] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const checkUserState = () => {
    const currentUser = userService.getCurrentUser()
    const isAuth = userService.isAuthenticated()
    
    const state = {
      timestamp: new Date().toISOString(),
      userService: {
        currentUser: currentUser,
        isAuthenticated: isAuth,
        anonymousId: userService.getAnonymousId()
      },
      localStorage: {
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        anonymous_id: localStorage.getItem('anonymous_id'),
        last_db_timeout: localStorage.getItem('last_db_timeout'),
        supabase_auth_error: localStorage.getItem('supabase_auth_error')
      },
      consistency: {
        userServiceVsLocalStorage: {
          userMatch: currentUser?.email === (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').email : null),
          authMatch: isAuth === (localStorage.getItem('isAuthenticated') === 'true')
        }
      }
    }
    
    setStateInfo(state)
    console.log('🔍 用户状态检查:', state)
  }

  useEffect(() => {
    checkUserState()
    
    if (autoRefresh) {
      const interval = setInterval(checkUserState, 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const syncUserState = () => {
    console.log('🔄 强制同步用户状态...')
    
    try {
      const storedUser = localStorage.getItem('user')
      const storedAuth = localStorage.getItem('isAuthenticated')
      
      if (storedUser && storedAuth === 'true') {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser && parsedUser.email) {
          userService.setCurrentUser(parsedUser)
          console.log('✅ 已同步localStorage用户到userService:', parsedUser.email)
        }
      } else {
        userService.setCurrentUser(null)
        console.log('✅ 已清除userService用户状态')
      }
      
      checkUserState()
    } catch (error) {
      console.error('❌ 同步失败:', error)
    }
  }

  const clearAllUserData = () => {
    console.log('🧹 清除所有用户数据...')
    
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('anonymous_id')
    localStorage.removeItem('last_db_timeout')
    localStorage.removeItem('supabase_auth_error')
    
    userService.setCurrentUser(null)
    
    console.log('✅ 所有用户数据已清除')
    checkUserState()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 用户状态调试页面</h1>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={checkUserState}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 检查状态
        </button>
        
        <button 
          onClick={syncUserState}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 同步状态
        </button>
        
        <button 
          onClick={clearAllUserData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧹 清除数据
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          自动刷新 (1秒)
        </label>
      </div>
      
      {stateInfo && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <h3>📊 当前状态</h3>
          
          {/* 一致性检查 */}
          <div style={{ marginBottom: '1rem' }}>
            <h4>🔍 状态一致性</h4>
            <div style={{
              padding: '0.5rem',
              backgroundColor: stateInfo.consistency.userServiceVsLocalStorage.userMatch && stateInfo.consistency.userServiceVsLocalStorage.authMatch ? '#d4edda' : '#f8d7da',
              border: '1px solid ' + (stateInfo.consistency.userServiceVsLocalStorage.userMatch && stateInfo.consistency.userServiceVsLocalStorage.authMatch ? '#c3e6cb' : '#f5c6cb'),
              borderRadius: '4px'
            }}>
              <p><strong>用户匹配:</strong> {stateInfo.consistency.userServiceVsLocalStorage.userMatch ? '✅ 一致' : '❌ 不一致'}</p>
              <p><strong>认证匹配:</strong> {stateInfo.consistency.userServiceVsLocalStorage.authMatch ? '✅ 一致' : '❌ 不一致'}</p>
            </div>
          </div>
          
          {/* 详细状态 */}
          <pre style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '1rem',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '600px'
          }}>
            {JSON.stringify(stateInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>📋 使用说明</h4>
        <ul>
          <li><strong>检查状态:</strong> 查看当前userService和localStorage的状态</li>
          <li><strong>同步状态:</strong> 将localStorage的用户数据同步到userService内存</li>
          <li><strong>清除数据:</strong> 清除所有用户相关数据，模拟登出</li>
          <li><strong>自动刷新:</strong> 每秒自动检查状态变化</li>
        </ul>
        
        <h4>🎯 问题诊断</h4>
        <ul>
          <li>如果Header显示用户头像但History显示登录按钮 → 状态不一致，点击"同步状态"</li>
          <li>如果刷新后状态变化 → localStorage和内存状态不同步</li>
          <li>如果Letters时有时无 → 用户状态在不同组件间不一致</li>
        </ul>
      </div>
    </div>
  )
}