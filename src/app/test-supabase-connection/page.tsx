'use client'

import { useState, useEffect } from 'react'
import { supabase, testSupabaseConnection } from '@/lib/supabase'

export default function TestSupabaseConnection() {
  const [status, setStatus] = useState<string>('等待测试...')
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const testConnection = async () => {
    setLoading(true)
    setLogs([])
    addLog('🔄 开始测试Supabase连接...')

    try {
      // 1. 检查Supabase客户端是否初始化
      if (!supabase) {
        addLog('❌ Supabase客户端未初始化')
        setStatus('失败：客户端未初始化')
        return
      }
      addLog('✅ Supabase客户端已初始化')

      // 2. 测试基础连接
      addLog('🔍 测试基础数据库连接...')
      await testSupabaseConnection()
      addLog('✅ 基础连接测试成功')

      // 3. 测试users表查询（公开查询）
      addLog('👥 测试users表查询...')
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (usersError) {
        addLog(`❌ Users表查询失败: ${usersError.message}`)
        addLog(`错误详情: ${JSON.stringify(usersError)}`)
      } else {
        addLog('✅ Users表查询成功')
      }

      // 4. 测试letters表查询
      addLog('📝 测试letters表查询...')
      const { data: lettersData, error: lettersError } = await supabase
        .from('letters')
        .select('id, recipient_name, song_title')
        .eq('is_public', true)
        .limit(3)

      if (lettersError) {
        addLog(`❌ Letters表查询失败: ${lettersError.message}`)
        addLog(`错误详情: ${JSON.stringify(lettersError)}`)
      } else {
        addLog(`✅ Letters表查询成功，找到 ${lettersData?.length || 0} 条记录`)
        if (lettersData && lettersData.length > 0) {
          lettersData.forEach((letter, index) => {
            addLog(`  📧 Letter ${index + 1}: "${letter.recipient_name}" - ${letter.song_title}`)
          })
        }
      }

      // 5. 测试Google OAuth状态
      addLog('🔐 检查认证状态...')
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        addLog(`❌ 认证状态检查失败: ${authError.message}`)
      } else if (session) {
        addLog(`✅ 用户已登录: ${session.user.email}`)
      } else {
        addLog('ℹ️ 当前未登录')
      }

      // 6. 测试用户创建（如果可能）
      addLog('👤 测试匿名用户创建...')
      const anonymousId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          anonymous_id: anonymousId,
          display_name: 'Test User',
          coins: 100,
          is_premium: false
        })
        .select()
        .single()

      if (createError) {
        addLog(`❌ 用户创建失败: ${createError.message}`)
        addLog(`错误代码: ${createError.code}`)
        
        // 检查是否是权限问题
        if (createError.code === '42501' || createError.message.includes('permission denied')) {
          addLog('⚠️ 这可能是Row Level Security (RLS)权限问题')
        }
      } else {
        addLog(`✅ 测试用户创建成功: ${newUser.id}`)
        
        // 清理测试数据
        await supabase
          .from('users')
          .delete()
          .eq('id', newUser.id)
        addLog('🧹 测试数据已清理')
      }

      setStatus('✅ 连接测试完成！')
      addLog('🎉 所有测试完成')

    } catch (error: any) {
      addLog(`💥 测试过程中出现异常: ${error.message}`)
      setStatus(`❌ 测试失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testGoogleAuth = async () => {
    if (!supabase) {
      addLog('❌ Supabase客户端未初始化')
      return
    }

    addLog('🔗 启动Google OAuth测试...')
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        addLog(`❌ OAuth启动失败: ${error.message}`)
      } else {
        addLog('✅ OAuth重定向已启动')
      }
    } catch (error: any) {
      addLog(`💥 OAuth测试异常: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 Supabase连接测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>状态:</strong> {status}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testConnection}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '测试中...' : '开始连接测试'}
        </button>

        <button 
          onClick={testGoogleAuth}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          测试Google OAuth
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '5px',
        padding: '15px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <h3>测试日志:</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#6c757d' }}>点击"开始连接测试"查看详细日志...</p>
        ) : (
          <pre style={{ 
            margin: 0, 
            fontSize: '12px', 
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap'
          }}>
            {logs.join('\n')}
          </pre>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6c757d' }}>
        <p><strong>测试项目包括:</strong></p>
        <ul>
          <li>Supabase客户端初始化</li>
          <li>数据库基础连接</li>
          <li>Users表查询权限</li>
          <li>Letters表公开数据查询</li>
          <li>用户认证状态检查</li>
          <li>用户创建权限测试</li>
          <li>Google OAuth配置</li>
        </ul>
      </div>
    </div>
  )
}