'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugUserLettersDirectPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const queryUserLetters = async () => {
    setLoading(true)
    
    if (!supabase) {
      setResult({ error: 'Supabase not available' })
      setLoading(false)
      return
    }

    try {
      const userId = 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981'
      
      // 直接查询letters表
      const { data, error, count } = await supabase
        .from('letters')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      setResult({
        userId,
        totalCount: count,
        letters: data,
        error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      setResult({ error: err })
    } finally {
      setLoading(false)
    }
  }

  const queryAllLetters = async () => {
    setLoading(true)
    
    try {
      const { data, error, count } = await supabase!
        .from('letters')
        .select('user_id, anonymous_id, recipient_name, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(20)

      setResult({
        type: 'all_letters',
        totalCount: count,
        letters: data,
        error,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      setResult({ error: err })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>调试用户Letters查询</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={queryUserLetters}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          查询用户Letters
        </button>
        
        <button 
          onClick={queryAllLetters}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          查询所有Letters
        </button>
      </div>

      {loading && <p>加载中...</p>}
      
      {result && (
        <div>
          <h3>查询结果:</h3>
          <pre style={{
            background: '#f8f9fa',
            padding: '1rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '500px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}