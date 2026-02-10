'use client'

import { useState } from 'react'

export default function MigrateUserDataPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const migrateAnonymousData = () => {
    setLoading(true)
    setResult('🔄 开始迁移匿名用户数据...\n\n')
    
    try {
      // 1. 获取当前Anonymous ID
      const currentAnonymousId = localStorage.getItem('anonymous_id')
      setResult(prev => prev + `当前Anonymous ID: ${currentAnonymousId}\n\n`)
      
      // 2. 获取所有本地Letters
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      setResult(prev => prev + `找到 ${localLetters.length} 条本地Letters\n\n`)
      
      if (localLetters.length === 0) {
        setResult(prev => prev + '❌ 没有找到需要迁移的数据\n')
        setLoading(false)
        return
      }
      
      // 3. 分析现有的Anonymous IDs
      const anonymousIds = Array.from(new Set(localLetters.map((letter: any) => letter.anonymous_id).filter(Boolean)))
      setResult(prev => prev + `发现的Anonymous IDs:\n${anonymousIds.map(id => `- ${id}`).join('\n')}\n\n`)
      
      // 4. 统计每个ID的Letters数量
      const idCounts = anonymousIds.map(id => ({
        id,
        count: localLetters.filter((letter: any) => letter.anonymous_id === id).length
      }))
      
      setResult(prev => prev + `Letters分布:\n${idCounts.map(({ id, count }) => `- ${id}: ${count}条`).join('\n')}\n\n`)
      
      // 5. 如果当前ID没有Letters，将所有Letters迁移到当前ID
      const currentIdLetters = localLetters.filter((letter: any) => letter.anonymous_id === currentAnonymousId)
      
      if (currentIdLetters.length === 0 && currentAnonymousId) {
        setResult(prev => prev + '🔄 将所有Letters迁移到当前Anonymous ID...\n')
        
        const updatedLetters = localLetters.map((letter: any) => ({
          ...letter,
          anonymous_id: currentAnonymousId
        }))
        
        localStorage.setItem('letters', JSON.stringify(updatedLetters))
        
        setResult(prev => prev + `✅ 成功迁移 ${localLetters.length} 条Letters到 ${currentAnonymousId}\n\n`)
        
        // 6. 验证迁移结果
        const verifyLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const migratedCount = verifyLetters.filter((letter: any) => letter.anonymous_id === currentAnonymousId).length
        
        setResult(prev => prev + `✅ 验证成功：${migratedCount} 条Letters已迁移\n`)
        setResult(prev => prev + `现在可以前往History页面查看你的Letters了！\n`)
        
      } else if (currentIdLetters.length > 0) {
        setResult(prev => prev + `✅ 当前ID已有 ${currentIdLetters.length} 条Letters，无需迁移\n`)
      } else {
        setResult(prev => prev + `❌ 当前Anonymous ID为空，无法迁移\n`)
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 迁移失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const useOldestAnonymousId = () => {
    setLoading(true)
    setResult('🔄 切换到最早的Anonymous ID...\n\n')
    
    try {
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      if (localLetters.length === 0) {
        setResult(prev => prev + '❌ 没有找到本地Letters\n')
        setLoading(false)
        return
      }
      
      // 找到最早的Letter的Anonymous ID
      const sortedLetters = localLetters.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      const oldestLetter = sortedLetters[0]
      const oldestAnonymousId = oldestLetter.anonymous_id
      
      if (oldestAnonymousId) {
        // 切换到最早的Anonymous ID
        localStorage.setItem('anonymous_id', oldestAnonymousId)
        setResult(prev => prev + `✅ 已切换到最早的Anonymous ID: ${oldestAnonymousId}\n`)
        setResult(prev => prev + `现在刷新页面，应该能看到你的所有Letters了！\n`)
        
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult(prev => prev + `❌ 无法找到有效的Anonymous ID\n`)
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 切换失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const clearAllData = () => {
    if (confirm('⚠️ 确定要清除所有本地数据吗？这个操作不可逆！')) {
      localStorage.removeItem('letters')
      localStorage.removeItem('anonymous_id')
      setResult('🗑️ 已清除所有本地数据，刷新页面将重新开始\n')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>🔧 匿名用户数据迁移工具</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>🚨 检测到问题</h3>
        <p>你的本地Letters属于旧的Anonymous ID，而当前浏览器使用新的Anonymous ID，导致History页面无法显示你的Letters。</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={migrateAnonymousData}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem',
            marginBottom: '0.5rem'
          }}
        >
          {loading ? '迁移中...' : '🔄 迁移数据到当前ID'}
        </button>
        
        <button 
          onClick={useOldestAnonymousId}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem',
            marginBottom: '0.5rem'
          }}
        >
          {loading ? '切换中...' : '🔙 使用最早的ID'}
        </button>
        
        <button 
          onClick={clearAllData}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          🗑️ 清除所有数据
        </button>
      </div>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '6px',
        minHeight: '300px',
        whiteSpace: 'pre-wrap',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        {result || '点击按钮开始数据迁移...'}
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
        <h4>使用说明：</h4>
        <ul>
          <li><strong>迁移数据到当前ID</strong>：将所有Letters的Anonymous ID更新为当前ID</li>
          <li><strong>使用最早的ID</strong>：切换回包含最多Letters的旧ID（推荐）</li>
          <li><strong>清除所有数据</strong>：重新开始，会丢失所有本地Letters</li>
        </ul>
        <p><strong>建议</strong>：选择"使用最早的ID"，这样可以保留所有历史数据。</p>
      </div>
    </div>
  )
}