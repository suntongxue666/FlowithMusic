'use client'

import { useState } from 'react'

export default function CheckInteractionsPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkInteractions = async () => {
    setLoading(true)
    try {
      // 检查特定letter的互动记录
      const response = await fetch('/api/letters/2025082917203godTJ/interactions')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>检查互动记录</h1>
      <button onClick={checkInteractions} disabled={loading}>
        {loading ? '检查中...' : '检查 Letter 2025082917203godTJ 的互动记录'}
      </button>
      
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>结果：</h2>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}