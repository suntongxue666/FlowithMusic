'use client'

import { useState } from 'react'

export default function MetadataTestPage() {
  const [linkId, setLinkId] = useState('202507281941WVPqxg')
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testMetadata = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/test-metadata?linkId=${linkId}`)
      const result = await response.json()
      setTestResults(result)
    } catch (error) {
      setTestResults({ error: 'Failed to test metadata' })
    }
    setLoading(false)
  }

  const clearCache = async () => {
    try {
      const response = await fetch('/api/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      })
      const result = await response.json()
      alert(JSON.stringify(result, null, 2))
    } catch (error) {
      alert('Failed to clear cache')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>元数据测试工具</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Letter ID: </label>
        <input 
          type="text" 
          value={linkId} 
          onChange={(e) => setLinkId(e.target.value)}
          style={{ padding: '5px', width: '300px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testMetadata} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
          {loading ? '测试中...' : '测试元数据生成'}
        </button>
        <button onClick={clearCache} style={{ padding: '10px' }}>
          清除缓存
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <a 
          href={`/letter/${linkId}`} 
          target="_blank" 
          style={{ padding: '10px', background: '#007cba', color: 'white', textDecoration: 'none' }}
        >
          打开Letter页面 ↗
        </a>
      </div>
      
      {testResults && (
        <div>
          <h2>测试结果:</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '30px', background: '#f0f0f0', padding: '15px' }}>
        <h3>测试步骤:</h3>
        <ol>
          <li>点击"测试元数据生成"查看API返回的标题</li>
          <li>点击"打开Letter页面"查看实际页面标题</li>
          <li>如果标题不匹配，点击"清除缓存"</li>
          <li>强制刷新页面 (Ctrl+Shift+R)</li>
          <li>或在隐私模式下打开页面</li>
        </ol>
      </div>
    </div>
  )
}