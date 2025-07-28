'use client'

import { useState } from 'react'
import { supabaseProxy } from '@/lib/supabaseProxy'

export default function CleanTestData() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const cleanTestData = async () => {
    setLoading(true)
    setResults([])

    try {
      // 删除测试Letter
      addResult('🗑️ 开始删除测试数据...')
      
      // 删除Debug Test的Letter
      const testLetters = await supabaseProxy.select('letters', {
        select: 'id,link_id,recipient_name',
        filters: { 
          eq: { recipient_name: 'Debug Test' }
        }
      })

      if (testLetters.data && testLetters.data.length > 0) {
        for (const letter of testLetters.data) {
          try {
            // 注意：这里需要实现delete方法
            addResult(`🗑️ 找到测试Letter: ${letter.link_id} -> ${letter.recipient_name}`)
            // 暂时通过API直接删除
            const response = await fetch('/api/supabase-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete',
                table: 'letters',
                filters: { eq: { id: letter.id } }
              })
            })
            
            if (response.ok) {
              addResult(`✅ 删除成功: ${letter.link_id}`)
            } else {
              addResult(`❌ 删除失败: ${letter.link_id}`)
            }
          } catch (error) {
            addResult(`❌ 删除出错: ${error}`)
          }
        }
      } else {
        addResult('ℹ️ 没有找到测试数据')
      }

      addResult('🎉 清理完成！')
    } catch (error) {
      addResult(`❌ 清理过程出错: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>清理测试数据</h1>
      <p>删除Debug Test等测试Letter</p>
      
      <button 
        onClick={cleanTestData}
        disabled={loading}
        style={{
          padding: '1rem 2rem',
          background: loading ? '#ccc' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? '清理中...' : '🗑️ 清理测试数据'}
      </button>

      <div>
        <h2>清理日志：</h2>
        <div style={{
          background: '#f8f9fa',
          padding: '1rem',
          borderRadius: '4px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          {results.map((result, index) => (
            <div key={index}>{result}</div>
          ))}
        </div>
      </div>
    </div>
  )
}