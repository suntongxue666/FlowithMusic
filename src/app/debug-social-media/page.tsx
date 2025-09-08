'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

export default function DebugSocialMediaPage() {
  const [localStorageUser, setLocalStorageUser] = useState<any>(null)
  const [memoryUser, setMemoryUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [cleaning, setCleaning] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAllUserData()
  }, [])

  const loadAllUserData = () => {
    // 检查localStorage用户数据
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setLocalStorageUser(parsed)
        } catch (e) {
          console.error('localStorage解析失败:', e)
        }
      }
    }

    // 检查内存中的用户
    const currentUser = userService.getCurrentUser()
    setMemoryUser(currentUser)
  }

  const fetchDbUser = async () => {
    if (!supabase) {
      console.log('Supabase不可用')
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          console.error('获取数据库用户失败:', error)
        } else {
          setDbUser(userData)
        }
      }
    } catch (error) {
      console.error('数据库查询异常:', error)
    }
  }

  const cleanSocialMediaData = async () => {
    setCleaning(true)
    try {
      if (dbUser?.id) {
        await userService.cleanupUserSocialMediaData(dbUser.id)
        await fetchDbUser() // 重新获取数据
        console.log('✅ 社交媒体数据清理完成')
      }
    } catch (error) {
      console.error('❌ 清理失败:', error)
    } finally {
      setCleaning(false)
    }
  }

  const fixUserIdIssue = async () => {
    setFixing(true)
    try {
      console.log('🔧 开始修复用户ID问题...')
      
      // 清理损坏的session
      await userService.cleanupCorruptedSession()
      
      // 强制重新获取和修复用户数据
      const updatedUser = await userService.fetchAndCacheUser()
      if (updatedUser) {
        console.log('✅ 用户数据重新获取成功:', updatedUser.id)
        loadAllUserData()
      } else {
        console.warn('⚠️ 无法重新获取用户数据，尝试手动修复localStorage...')
        
        // 如果fetchAndCacheUser失败，尝试手动修复localStorage中的ID
        if (localStorageUser && !localStorageUser.id && localStorageUser.google_id) {
          const fixedUser = {
            ...localStorageUser,
            id: localStorageUser.google_id
          }
          localStorage.setItem('user', JSON.stringify(fixedUser))
          console.log('🔧 手动修复localStorage用户ID:', fixedUser.id)
          loadAllUserData()
        }
      }
    } catch (error) {
      console.error('❌ 修复失败:', error)
    } finally {
      setFixing(false)
    }
  }

  const testSocialMediaSave = async () => {
    setLoading(true)
    try {
      console.log('🔍 测试社交媒体保存...')
      const result = await userService.updateSocialMedia({
        whatsapp: '+1234567890'
      })
      console.log('✅ 保存测试成功:', result)
      loadAllUserData()
      await fetchDbUser()
    } catch (error) {
      console.error('❌ 保存测试失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const forceSignOut = () => {
    userService.forceSignOut()
    window.location.reload()
  }

  const renderUserData = (title: string, userData: any, bgColor: string) => (
    <div style={{ 
      border: '1px solid #333', 
      padding: '15px', 
      borderRadius: '8px',
      backgroundColor: bgColor
    }}>
      <h3>{title}</h3>
      {userData ? (
        <>
          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            <div>✅ Email: {userData?.email || '❌ 无'}</div>
            <div>✅ ID: {userData?.id ? `${userData.id.substring(0, 8)}...` : '❌ 无'}</div>
            <div>✅ Google ID: {userData?.google_id ? `${userData.google_id.substring(0, 8)}...` : '❌ 无'}</div>
            <div>📱 社交媒体: {userData?.social_media_info ? Object.keys(userData.social_media_info).length + '个字段' : '❌ 无'}</div>
          </div>
          
          {userData?.social_media_info && (
            <div style={{ marginBottom: '10px' }}>
              <strong>社交媒体内容:</strong>
              <pre style={{ 
                fontSize: '10px', 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                padding: '8px', 
                borderRadius: '4px',
                maxHeight: '100px',
                overflow: 'auto'
              }}>
                {JSON.stringify(userData.social_media_info, null, 2)}
              </pre>
            </div>
          )}
          
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '12px' }}>显示完整数据</summary>
            <pre style={{ 
              fontSize: '10px', 
              overflow: 'auto', 
              maxHeight: '200px',
              backgroundColor: 'rgba(0,0,0,0.1)',
              padding: '8px',
              borderRadius: '4px',
              marginTop: '8px'
            }}>
              {JSON.stringify(userData, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <div>无数据</div>
      )}
    </div>
  )

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#0a0a0a', 
      color: '#fff', 
      minHeight: '100vh' 
    }}>
      <h1>🔧 社交媒体调试页面</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={loadAllUserData}
          style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          🔄 刷新数据
        </button>
        <button 
          onClick={fetchDbUser}
          style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          🔍 获取数据库用户
        </button>
        <button 
          onClick={fixUserIdIssue} 
          disabled={fixing}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: fixing ? '#666' : '#d63384', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          {fixing ? '🔧 修复中...' : '🔧 修复用户ID'}
        </button>
        <button 
          onClick={cleanSocialMediaData} 
          disabled={cleaning || !dbUser}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: cleaning ? '#666' : '#198754', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          {cleaning ? '🧹 清理中...' : '🧹 清理污染数据'}
        </button>
        <button 
          onClick={testSocialMediaSave} 
          disabled={loading || !memoryUser?.id}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: loading ? '#666' : '#0d6efd', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          {loading ? '🧪 测试中...' : '🧪 测试保存'}
        </button>
        <button 
          onClick={forceSignOut}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          🚪 强制登出
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {renderUserData('💾 localStorage用户', localStorageUser, '#1a2332')}
        {renderUserData('🧠 内存用户', memoryUser, '#321a32')}
        {renderUserData('🗄️ 数据库用户', dbUser, '#1a3219')}
      </div>
    </div>
  )
}