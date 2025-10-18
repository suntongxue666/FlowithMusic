'use client'

import { useState } from 'react'

export default function ResetUserDataPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const resetAllData = () => {
    setLoading(true)
    setResult('🔄 正在重置用户数据...\n\n')
    
    try {
      // 1. 显示当前状态
      const currentAnonymousId = localStorage.getItem('anonymous_id')
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      setResult(prev => prev + `当前状态:\n`)
      setResult(prev => prev + `- Anonymous ID: ${currentAnonymousId}\n`)
      setResult(prev => prev + `- 本地Letters: ${localLetters.length}条\n\n`)
      
      // 2. 清除所有数据
      localStorage.removeItem('letters')
      localStorage.removeItem('anonymous_id')
      localStorage.removeItem('user_identity')
      localStorage.removeItem('user_identity_backup')
      localStorage.removeItem('identity_notification_dismissed')
      
      setResult(prev => prev + '🗑️ 已清除以下数据:\n')
      setResult(prev => prev + '- letters (本地Letters)\n')
      setResult(prev => prev + '- anonymous_id (匿名用户ID)\n')
      setResult(prev => prev + '- user_identity (用户身份)\n')
      setResult(prev => prev + '- user_identity_backup (身份备份)\n')
      setResult(prev => prev + '- identity_notification_dismissed (通知状态)\n\n')
      
      setResult(prev => prev + '✅ 数据重置完成！\n\n')
      setResult(prev => prev + '🔄 3秒后自动刷新页面，你将获得全新的用户身份...\n')
      
      // 3. 延迟刷新页面
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
      
    } catch (error) {
      setResult(prev => prev + `❌ 重置失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const showCurrentStatus = () => {
    setLoading(true)
    setResult('📊 正在检查当前状态...\n\n')
    
    try {
      const currentAnonymousId = localStorage.getItem('anonymous_id')
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      const userIdentity = localStorage.getItem('user_identity')
      const identityBackup = localStorage.getItem('user_identity_backup')
      
      setResult(prev => prev + `📱 当前数据状态:\n`)
      setResult(prev => prev + `- Anonymous ID: ${currentAnonymousId || '未设置'}\n`)
      setResult(prev => prev + `- 本地Letters: ${localLetters.length}条\n`)
      setResult(prev => prev + `- 用户身份: ${userIdentity ? '已设置' : '未设置'}\n`)
      setResult(prev => prev + `- 身份备份: ${identityBackup ? '已设置' : '未设置'}\n\n`)
      
      if (localLetters.length > 0) {
        setResult(prev => prev + `📋 Letters详情:\n`)
        
        // 按Anonymous ID分组统计
        const groupByAnonymousId = localLetters.reduce((acc: any, letter: any) => {
          const id = letter.anonymous_id || 'null'
          if (!acc[id]) acc[id] = []
          acc[id].push(letter)
          return acc
        }, {})
        
        Object.entries(groupByAnonymousId).forEach(([id, letters]: [string, any]) => {
          setResult(prev => prev + `- ${id}: ${letters.length}条\n`)
        })
        
        setResult(prev => prev + `\n🚨 问题分析:\n`)
        if (currentAnonymousId && !groupByAnonymousId[currentAnonymousId]) {
          setResult(prev => prev + `❌ 当前Anonymous ID (${currentAnonymousId}) 没有对应的Letters\n`)
          setResult(prev => prev + `💡 这就是为什么History页面显示为空的原因\n\n`)
          setResult(prev => prev + `🔧 解决方案: 点击"重置所有数据"清除旧数据，重新开始\n`)
        } else {
          setResult(prev => prev + `✅ 当前Anonymous ID有对应的Letters，应该能正常显示\n`)
        }
      } else {
        setResult(prev => prev + `📝 没有本地Letters数据\n`)
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 检查失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>🔄 用户数据重置工具</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>ℹ️ 说明</h3>
        <p>此工具将清除所有本地存储的用户数据，包括Letters、匿名ID等，让你重新开始使用。</p>
        <p><strong>重置后：</strong></p>
        <ul>
          <li>获得全新的匿名用户身份</li>
          <li>History页面将为空（符合新用户状态）</li>
          <li>新创建的Letters将正确显示在History中</li>
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={showCurrentStatus}
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
          {loading ? '检查中...' : '📊 检查当前状态'}
        </button>
        
        <button 
          onClick={resetAllData}
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
          {loading ? '重置中...' : '🔄 重置所有数据'}
        </button>
      </div>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '6px',
        minHeight: '300px',
        whiteSpace: 'pre-wrap',
        fontSize: '14px',
        lineHeight: '1.4',
        border: '1px solid #e9ecef'
      }}>
        {result || '点击按钮开始操作...'}
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
        <h4>⚠️ 注意事项：</h4>
        <ul>
          <li>重置操作不可逆，会永久删除所有本地数据</li>
          <li>如果你已登录Google账户，服务器上的数据不会受影响</li>
          <li>重置后建议立即登录Google账户以避免将来数据丢失</li>
        </ul>
      </div>
    </div>
  )
}