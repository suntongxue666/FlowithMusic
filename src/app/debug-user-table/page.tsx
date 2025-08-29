'use client'

import { useState } from 'react'
import { userService } from '@/lib/userService'

export default function DebugUserTablePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testUserTableStructure = async () => {
    setLoading(true)
    try {
      // 获取当前用户
      const currentUser = userService.getCurrentUser()
      if (!currentUser) {
        throw new Error('用户未登录')
      }

      console.log('🔍 当前用户:', currentUser)

      // 测试直接数据库查询
      const response = await fetch('/api/debug-user-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('❌ 测试失败:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const testSocialMediaUpdate = async () => {
    setLoading(true)
    try {
      const currentUser = userService.getCurrentUser()
      if (!currentUser) {
        throw new Error('用户未登录')
      }

      console.log('🔄 测试社交媒体更新...')
      
      // 尝试更新社交媒体信息
      const testData = {
        whatsapp: `+${Date.now()}`, // 使用时间戳确保唯一性
        instagram: `test_${Date.now()}`
      }

      console.log('📤 发送更新数据:', testData)
      
      const updatedUser = await userService.updateSocialMedia(testData)
      
      console.log('✅ 更新成功:', updatedUser)
      setResult({ 
        success: true, 
        testData, 
        updatedUser,
        socialMediaInfo: updatedUser.social_media_info 
      })

    } catch (error) {
      console.error('❌ 更新失败:', error)
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>用户表结构调试</h1>
      
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={testUserTableStructure} disabled={loading}>
          测试用户表结构
        </button>
        
        <button onClick={testSocialMediaUpdate} disabled={loading}>
          测试社交媒体更新
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>测试结果：</h2>
          <div style={{ 
            background: result.error || result.success === false ? '#fee' : '#efe', 
            padding: '1rem', 
            borderRadius: '4px',
            border: `1px solid ${result.error || result.success === false ? '#fcc' : '#cfc'}`
          }}>
            <pre style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '1rem', 
              borderRadius: '4px', 
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}