'use client'

import { useState } from 'react'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

export default function TestGoogleAuth() {
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testGoogleAuth = async () => {
    setLoading(true)
    setLog([])
    
    try {
      addLog('🔍 开始Google OAuth测试...')
      
      // 检查Supabase配置
      addLog(`🔧 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      addLog(`🔧 有Supabase客户端: ${!!supabase}`)
      
      if (!supabase) {
        addLog('❌ Supabase客户端未初始化')
        return
      }
      
      // 检查当前会话
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      addLog(`🔍 当前会话: ${sessionData.session ? '有会话' : '无会话'}`)
      if (sessionError) {
        addLog(`⚠️ 会话检查错误: ${sessionError.message}`)
      }
      
      // 测试Google OAuth配置
      addLog('🔗 开始Google OAuth登录...')
      addLog(`🔗 重定向URI: http://localhost:3000/auth/callback`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        addLog(`❌ Google OAuth错误: ${error.message}`)
        addLog(`❌ 错误详情: ${JSON.stringify(error, null, 2)}`)
      } else {
        addLog(`✅ OAuth请求成功: ${JSON.stringify(data, null, 2)}`)
        addLog('✅ 如果页面没有重定向到Google，请检查Google Cloud Console配置')
      }
      
    } catch (error: any) {
      addLog(`💥 测试失败: ${error.message}`)
      addLog(`💥 错误堆栈: ${error.stack}`)
    } finally {
      setLoading(false)
    }
  }

  const checkSupabaseAuth = async () => {
    setLoading(true)
    setLog([])
    
    try {
      addLog('🔍 检查Supabase Auth配置...')
      
      if (!supabase) {
        addLog('❌ Supabase客户端未初始化')
        return
      }
      
      // 检查Supabase项目设置
      const { data: settings, error } = await supabase.auth.getSession()
      addLog(`✅ Supabase Auth响应: ${!!settings}`)
      
      if (error) {
        addLog(`❌ Auth检查错误: ${error.message}`)
      }
      
      addLog('📋 请检查以下Supabase设置:')
      addLog('1. Authentication > Providers > Google 是否已启用')
      addLog('2. Google Client ID 和 Secret 是否正确填写')
      addLog('3. 重定向URL是否包含: http://localhost:3000/auth/callback')
      addLog('4. Google Cloud Console OAuth设置是否正确')
      
    } catch (error: any) {
      addLog(`💥 检查失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Google OAuth 测试诊断</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={testGoogleAuth}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? '测试中...' : '测试Google登录'}
        </button>
        
        <button 
          onClick={checkSupabaseAuth}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#16a085',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '检查中...' : '检查Supabase配置'}
        </button>
      </div>
      
      <div style={{
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3>诊断日志:</h3>
        {log.length === 0 ? (
          <p>点击按钮开始测试...</p>
        ) : (
          log.map((entry, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {entry}
            </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd', borderRadius: '4px' }}>
        <h3>常见问题排查:</h3>
        <ul>
          <li>确保Google Cloud Console中OAuth 2.0客户端ID已创建</li>
          <li>授权重定向URI包含: http://localhost:3000/auth/callback</li>
          <li>Supabase项目中Google Provider已启用且配置正确</li>
          <li>环境变量GOOGLE_CLIENT_ID和GOOGLE_CLIENT_SECRET正确</li>
        </ul>
      </div>
    </div>
  )
}