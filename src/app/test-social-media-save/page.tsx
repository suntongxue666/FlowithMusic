'use client'

import { useState } from 'react'
import { userService } from '@/lib/userService'

export default function TestSocialMediaSavePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [whatsapp, setWhatsapp] = useState('')

  const testSocialMediaSave = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('🧪 测试社交媒体保存功能...')
      
      // 1. 检查当前用户状态
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      
      console.log('👤 当前用户状态:', {
        user: currentUser,
        isAuth: isAuth,
        email: currentUser?.email
      })
      
      if (!isAuth || !currentUser) {
        throw new Error('用户未登录，请先登录')
      }
      
      // 2. 尝试保存WhatsApp信息
      console.log('💾 尝试保存WhatsApp:', whatsapp)
      
      const updatedUser = await userService.updateSocialMedia({
        whatsapp: whatsapp
      })
      
      console.log('✅ 保存成功:', updatedUser)
      
      setResult({
        success: true,
        message: '社交媒体信息保存成功！',
        updatedUser: {
          id: updatedUser.id,
          email: updatedUser.email,
          social_media_info: updatedUser.social_media_info
        }
      })
      
    } catch (error) {
      console.error('❌ 保存失败:', error)
      setResult({
        success: false,
        message: `保存失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error
      })
    } finally {
      setLoading(false)
    }
  }

  const checkUserState = async () => {
    setLoading(true)
    try {
      const currentUser = userService.getCurrentUser()
      const asyncUser = await userService.getCurrentUserAsync()
      const isAuth = userService.isAuthenticated()
      
      setResult({
        success: true,
        message: '用户状态检查完成',
        userState: {
          currentUser: currentUser,
          asyncUser: asyncUser,
          isAuthenticated: isAuth,
          localStorage: {
            user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,
            isAuthenticated: localStorage.getItem('isAuthenticated')
          }
        }
      })
    } catch (error) {
      setResult({
        success: false,
        message: `检查失败: ${error}`,
        error: error
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 社交媒体保存功能测试</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>测试WhatsApp保存</h3>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="输入WhatsApp号码"
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginRight: '1rem',
            width: '200px'
          }}
        />
        <button
          onClick={testSocialMediaSave}
          disabled={loading || !whatsapp}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? '保存中...' : '💾 保存WhatsApp'}
        </button>
        
        <button
          onClick={checkUserState}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '检查中...' : '🔍 检查用户状态'}
        </button>
      </div>
      
      {result && (
        <div style={{
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: result.success ? '#155724' : '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h4>{result.success ? '✅ 成功' : '❌ 失败'}</h4>
          <p>{result.message}</p>
          
          {result.updatedUser && (
            <div>
              <h5>更新后的用户信息:</h5>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(result.updatedUser, null, 2)}
              </pre>
            </div>
          )}
          
          {result.userState && (
            <div>
              <h5>用户状态:</h5>
              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
                {JSON.stringify(result.userState, null, 2)}
              </pre>
            </div>
          )}
          
          {result.error && (
            <div>
              <h5>错误详情:</h5>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>📋 使用说明</h4>
        <ol>
          <li>确保已登录用户</li>
          <li>输入WhatsApp号码</li>
          <li>点击"保存WhatsApp"测试保存功能</li>
          <li>点击"检查用户状态"查看当前用户状态</li>
        </ol>
      </div>
    </div>
  )
}