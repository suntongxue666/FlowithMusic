'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestGoogleLoginPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testGoogleLogin = async () => {
    setLoading(true)
    setResult('开始测试Google登录...')
    
    try {
      if (!supabase) {
        setResult('❌ Supabase客户端未初始化')
        return
      }

      console.log('🔍 测试Google OAuth配置...')
      console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('🔧 当前域名:', window.location.origin)
      console.log('🔧 重定向URI:', `${window.location.origin}/auth/callback`)

      // 直接调用Supabase的Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('❌ Google OAuth错误:', error)
        setResult(`❌ Google OAuth失败: ${error.message}`)
      } else {
        console.log('✅ Google OAuth启动成功:', data)
        setResult('✅ Google OAuth启动成功，应该会跳转到Google登录页面')
      }

    } catch (error) {
      console.error('💥 测试异常:', error)
      setResult(`💥 测试异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentSession = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        setResult('❌ Supabase客户端未初始化')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setResult(`❌ 获取会话失败: ${error.message}`)
      } else if (session) {
        setResult(`✅ 当前会话存在:
用户ID: ${session.user.id}
邮箱: ${session.user.email}
Token: ${session.access_token ? '存在' : '不存在'}`)
      } else {
        setResult('ℹ️ 当前无活跃会话')
      }
    } catch (error) {
      setResult(`💥 检查会话异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testSupabaseConnection = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        setResult('❌ Supabase客户端未初始化')
        return
      }

      // 测试数据库连接
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        setResult(`❌ 数据库连接失败: ${error.message}`)
      } else {
        setResult('✅ 数据库连接正常')
      }
    } catch (error) {
      setResult(`💥 数据库测试异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = () => {
    localStorage.clear()
    setResult('🧹 已清除所有localStorage数据')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Google登录测试页面</h1>
      <p>测试sunwei7482@gmail.com和tiktreeapp@gmail.com登录问题</p>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={testGoogleLogin}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '测试中...' : '🔍 测试Google登录'}
        </button>
        
        <button 
          onClick={checkCurrentSession}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          📊 检查当前会话
        </button>
        
        <button 
          onClick={testSupabaseConnection}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          🔗 测试数据库连接
        </button>
        
        <button 
          onClick={clearAllData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🧹 清除所有数据
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
          <h3>📊 测试结果</h3>
          <pre style={{ 
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {result}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <h4>📋 测试步骤</h4>
        <ol>
          <li><strong>清除所有数据</strong>：清空localStorage，确保干净环境</li>
          <li><strong>测试数据库连接</strong>：确认Supabase连接正常</li>
          <li><strong>测试Google登录</strong>：启动OAuth流程</li>
          <li><strong>检查当前会话</strong>：验证登录状态</li>
        </ol>
        <p><strong>目标</strong>：找出sunwei7482@gmail.com和tiktreeapp@gmail.com无法登录的根本原因</p>
      </div>
    </div>
  )
}