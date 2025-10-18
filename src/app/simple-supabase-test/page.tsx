'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SimpleSupabaseTest() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const log = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
    console.log(message)
  }

  const runTests = async () => {
    setLoading(true)
    setResults([])
    
    log('🔄 开始Supabase连接测试...')

    // 测试1: 检查客户端初始化
    if (!supabase) {
      log('❌ Supabase客户端未初始化')
      setLoading(false)
      return
    }
    log('✅ Supabase客户端已初始化')

    try {
      // 测试2: 简单的letters表查询（公开数据）
      log('📝 测试letters表查询...')
      const { data: lettersData, error: lettersError } = await supabase
        .from('letters')
        .select('id, recipient_name, song_title, created_at')
        .eq('is_public', true)
        .limit(5)

      if (lettersError) {
        log(`❌ Letters查询失败: ${lettersError.message}`)
        log(`错误代码: ${lettersError.code}`)
      } else {
        log(`✅ Letters查询成功，找到 ${lettersData?.length || 0} 条记录`)
        lettersData?.forEach((letter, index) => {
          log(`  📧 ${index + 1}. ${letter.recipient_name} - ${letter.song_title}`)
        })
      }

      // 测试3: 认证状态
      log('🔐 检查认证状态...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        log(`❌ 认证检查失败: ${sessionError.message}`)
      } else if (session) {
        log(`✅ 已登录用户: ${session.user.email}`)
        
        // 如果已登录，测试用户相关操作
        log('👤 测试用户数据查询...')
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', session.user.id)
          .single()
          
        if (userError) {
          log(`⚠️ 用户数据查询失败: ${userError.message}`)
        } else {
          log(`✅ 用户数据: ${userData?.display_name || userData?.email || 'Unknown'}`)
        }
      } else {
        log('ℹ️ 当前未登录')
      }

      // 测试4: 测试匿名会话创建
      log('🔍 测试匿名会话创建...')
      const testAnonymousId = `test_${Date.now()}`
      
      const { data: sessionData, error: sessionInsertError } = await supabase
        .from('anonymous_sessions')
        .insert({
          anonymous_id: testAnonymousId,
          user_agent: navigator.userAgent
        })
        .select()
        .single()

      if (sessionInsertError) {
        log(`❌ 匿名会话创建失败: ${sessionInsertError.message || '未知错误'}`)
        log(`错误代码: ${sessionInsertError.code || '无错误代码'}`)
        log(`错误详情: ${JSON.stringify(sessionInsertError)}`)
        
        // 尝试通过代理API创建
        log('🔄 尝试通过代理API创建匿名会话...')
        try {
          const response = await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              table: 'anonymous_sessions',
              data: {
                anonymous_id: testAnonymousId,
                user_agent: navigator.userAgent
              }
            })
          })
          
          const proxyResult = await response.json()
          if (proxyResult.error) {
            log(`❌ 代理API也失败: ${proxyResult.error.message}`)
          } else {
            log(`✅ 代理API创建成功: ${proxyResult.data?.[0]?.id}`)
            // 清理测试数据
            await supabase.from('anonymous_sessions').delete().eq('id', proxyResult.data[0].id)
            log('🧹 测试数据已清理')
          }
        } catch (proxyError: any) {
          log(`💥 代理API异常: ${proxyError.message}`)
        }
      } else {
        log(`✅ 匿名会话创建成功: ${sessionData.id}`)
        
        // 清理测试数据
        await supabase
          .from('anonymous_sessions')
          .delete()
          .eq('id', sessionData.id)
        log('🧹 测试数据已清理')
      }

      log('✅ 所有测试完成')

    } catch (error: any) {
      log(`💥 测试异常: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testGoogleAuth = async () => {
    if (!supabase) {
      log('❌ Supabase未初始化')
      return
    }

    log('🔗 启动Google OAuth...')
    const redirectUrl = `${window.location.origin}/auth/callback`
    log(`重定向URL: ${redirectUrl}`)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        log(`❌ OAuth失败: ${error.message}`)
      } else {
        log('✅ OAuth重定向已启动')
      }
    } catch (error: any) {
      log(`💥 OAuth异常: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔍 Supabase简单测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests}
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
          {loading ? '测试中...' : '运行连接测试'}
        </button>

        <button 
          onClick={testGoogleAuth}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          测试Google登录
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '5px',
        padding: '15px',
        height: '400px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '13px'
      }}>
        {results.length === 0 ? (
          <p>点击按钮开始测试...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {result}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <p><strong>测试说明:</strong></p>
        <ul>
          <li>如果letters查询成功，说明基础连接正常</li>
          <li>如果匿名会话创建成功，说明写入权限正常</li>
          <li>Google OAuth测试会跳转到认证页面</li>
        </ul>
        
        <p><strong>下一步:</strong></p>
        <ul>
          <li>如果测试通过，我们可以开始集成真实的用户认证</li>
          <li>如果有权限错误，需要在Supabase后台执行RLS策略修复脚本</li>
        </ul>
      </div>
    </div>
  )
}