'use client'

import { useState } from 'react'
import { testSupabaseConnection } from '@/lib/supabase'

export default function DebugPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    setResult('🔍 开始诊断Supabase配置...\n\n')

    try {
      // 1. 检查环境变量
      setResult(prev => prev + '1️⃣ 检查环境变量:\n')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult(prev => prev + `- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ 已设置' : '❌ 未设置'}\n`)
      setResult(prev => prev + `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ 已设置' : '❌ 未设置'}\n\n`)
      
      if (supabaseUrl) {
        setResult(prev => prev + `- URL值: ${supabaseUrl}\n`)
      }
      if (supabaseKey) {
        setResult(prev => prev + `- Key值: ${supabaseKey.substring(0, 20)}...\n\n`)
      }

      // 2. 测试直接fetch请求
      setResult(prev => prev + '2️⃣ 测试直接API请求:\n')
      
      if (supabaseUrl && supabaseKey) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/letters?select=count&limit=1`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          })
          
          setResult(prev => prev + `- Response status: ${response.status}\n`)
          setResult(prev => prev + `- Response ok: ${response.ok ? '✅' : '❌'}\n`)
          
          if (response.ok) {
            const data = await response.json()
            setResult(prev => prev + `- Response data: ${JSON.stringify(data)}\n`)
          } else {
            const errorText = await response.text()
            setResult(prev => prev + `- Error response: ${errorText}\n`)
          }
        } catch (fetchError) {
          setResult(prev => prev + `- Fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}\n`)
        }
      } else {
        setResult(prev => prev + '- ❌ 无法测试，环境变量缺失\n')
      }

      setResult(prev => prev + '\n')

      // 3. 测试Supabase客户端连接
      setResult(prev => prev + '3️⃣ 测试Supabase客户端:\n')
      
      try {
        await testSupabaseConnection()
        setResult(prev => prev + '- ✅ Supabase客户端连接成功\n')
      } catch (clientError) {
        setResult(prev => prev + `- ❌ Supabase客户端连接失败: ${clientError instanceof Error ? clientError.message : 'Unknown'}\n`)
      }

      setResult(prev => prev + '\n')

      // 4. 检查当前域名
      setResult(prev => prev + '4️⃣ 检查当前域名:\n')
      setResult(prev => prev + `- 当前域名: ${typeof window !== 'undefined' ? window.location.origin : 'Server-side'}\n`)
      setResult(prev => prev + `- 用户代理: ${typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'Server-side'}\n`)

    } catch (error) {
      setResult(prev => prev + `\n❌ 诊断过程出错: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🔍 Supabase连接诊断工具</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runDiagnostics}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#FF6B6B',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '诊断中...' : '🔍 开始诊断'}
        </button>
      </div>
      
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        borderRadius: '0.5rem',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        minHeight: '300px',
        maxHeight: '70vh',
        overflowY: 'auto',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        {result || '点击按钮开始诊断...'}
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
        <p><strong>诊断说明：</strong></p>
        <ul>
          <li>检查环境变量是否正确设置</li>
          <li>测试直接API请求是否工作</li>
          <li>测试Supabase客户端连接</li>
          <li>检查当前域名和CORS配置</li>
        </ul>
      </div>
    </div>
  )
}