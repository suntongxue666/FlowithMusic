'use client'

import { useState } from 'react'

export default function DebugLetterPage() {
  const [linkId, setLinkId] = useState('2025082917203godTJ')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLetterData = async () => {
    setLoading(true)
    try {
      console.log('🔍 测试Letter数据:', linkId)
      
      const response = await fetch(`/api/letters/${linkId}`)
      const data = await response.json()
      
      console.log('📊 Letter数据:', data)
      setResult(data)
      
    } catch (error) {
      console.error('❌ 获取Letter失败:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testDirectSupabase = async () => {
    setLoading(true)
    try {
      console.log('🔍 测试直接Supabase查询:', linkId)
      
      const response = await fetch('/api/test-supabase')
      const data = await response.json()
      
      console.log('📊 Supabase连接测试:', data)
      setResult({ type: 'supabase_test', data })
      
    } catch (error) {
      console.error('❌ Supabase测试失败:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Letter数据调试</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label>
          Letter ID: 
          <input 
            type="text" 
            value={linkId} 
            onChange={(e) => setLinkId(e.target.value)}
            style={{ marginLeft: '8px', padding: '4px 8px', width: '200px' }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={testLetterData} disabled={loading}>
          测试Letter API数据
        </button>
        
        <button onClick={testDirectSupabase} disabled={loading}>
          测试Supabase连接
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>测试结果：</h2>
          <div style={{ 
            background: result.error ? '#fee' : '#efe', 
            padding: '1rem', 
            borderRadius: '4px',
            border: `1px solid ${result.error ? '#fcc' : '#cfc'}`
          }}>
            <h3>数据分析：</h3>
            {result.user ? (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: 'green' }}>✅ 包含用户信息</p>
                <p><strong>用户ID:</strong> {result.user.id}</p>
                <p><strong>显示名:</strong> {result.user.display_name}</p>
                <p><strong>头像:</strong> {result.user.avatar_url ? '有' : '无'}</p>
              </div>
            ) : (
              <p style={{ color: 'red' }}>❌ 缺少用户信息</p>
            )}
            
            <h3>完整数据：</h3>
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

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>调试说明：</h3>
        <ul>
          <li>检查Letter API是否返回用户信息</li>
          <li>验证用户数据的完整性</li>
          <li>确认发送者信息显示逻辑</li>
        </ul>
      </div>
    </div>
  )
}