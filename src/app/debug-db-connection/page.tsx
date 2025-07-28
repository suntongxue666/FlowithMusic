'use client'

import { useState } from 'react'
import { supabaseProxy } from '@/lib/supabaseProxy'
import { supabase } from '@/lib/supabase'

export default function DebugDBConnection() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, success: boolean, details: any) => {
    setResults(prev => [...prev, { test, success, details, timestamp: new Date().toISOString() }])
  }

  const runTests = async () => {
    setLoading(true)
    setResults([])

    // 1. 测试直接Supabase连接
    try {
      console.log('🔍 测试直接Supabase连接...')
      if (supabase) {
        const { data, error } = await supabase.from('letters').select('count').limit(1)
        if (error) {
          addResult('直接Supabase连接', false, error)
        } else {
          addResult('直接Supabase连接', true, data)
        }
      } else {
        addResult('直接Supabase连接', false, 'supabase客户端未初始化')
      }
    } catch (error) {
      addResult('直接Supabase连接', false, error)
    }

    // 2. 测试代理连接
    try {
      console.log('🔍 测试代理连接...')
      const proxyConnected = await supabaseProxy.testConnection()
      addResult('代理连接测试', proxyConnected, proxyConnected ? '连接成功' : '连接失败')
    } catch (error) {
      addResult('代理连接测试', false, error)
    }

    // 3. 测试代理查询
    try {
      console.log('🔍 测试代理查询...')
      const result = await supabaseProxy.select('letters', {
        select: 'id,link_id,recipient_name',
        limit: 5
      })
      addResult('代理查询测试', !!result.data, result)
    } catch (error) {
      addResult('代理查询测试', false, error)
    }

    // 4. 测试创建测试Letter
    try {
      console.log('🔍 测试创建Letter...')
      const testLetter = {
        user_id: null,
        anonymous_id: 'test-debug-' + Date.now(),
        link_id: 'test-' + Date.now(),
        recipient_name: 'Debug Test',
        message: 'This is a test letter to debug database connection issues.',
        song_id: 'test-song',
        song_title: 'Test Song',
        song_artist: 'Test Artist',
        song_album_cover: 'https://example.com/cover.jpg',
        song_preview_url: null,
        song_spotify_url: 'https://open.spotify.com/track/test',
        view_count: 0,
        is_public: true
      }

      const result = await supabaseProxy.insert('letters', testLetter)
      addResult('创建测试Letter', !!result.data, result)
    } catch (error) {
      addResult('创建测试Letter', false, error)
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>数据库连接诊断</h1>
      <p>用于诊断为什么sunwei7482@gmail.com的Letter其他用户看不到</p>
      
      <button 
        onClick={runTests}
        disabled={loading}
        style={{
          padding: '1rem 2rem',
          background: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? '测试中...' : '开始诊断'}
      </button>

      <div>
        <h2>测试结果：</h2>
        {results.map((result, index) => (
          <div 
            key={index}
            style={{
              padding: '1rem',
              margin: '0.5rem 0',
              border: `2px solid ${result.success ? '#28a745' : '#dc3545'}`,
              borderRadius: '4px',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da'
            }}
          >
            <h3>{result.success ? '✅' : '❌'} {result.test}</h3>
            <p><strong>时间:</strong> {new Date(result.timestamp).toLocaleString()}</p>
            <p><strong>详情:</strong></p>
            <pre style={{ background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}