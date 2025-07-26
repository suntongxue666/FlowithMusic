'use client'

import { useState } from 'react'

export default function CleanTestDataPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const analyzeTestData = () => {
    setLoading(true)
    setResult('🔍 正在分析测试数据...\n\n')
    
    try {
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      if (localLetters.length === 0) {
        setResult(prev => prev + '📝 没有找到本地Letters数据\n')
        setLoading(false)
        return
      }
      
      // 识别测试数据
      const testPatterns = [
        /^测试用户_\d+$/,
        /^Test.*_\d+$/,
        /^test.*_\d+$/i,
        /^Database Test Recipient$/,
        /^测试.*$/
      ]
      
      const testLetters = localLetters.filter((letter: any) => {
        return testPatterns.some(pattern => pattern.test(letter.recipient_name))
      })
      
      const realLetters = localLetters.filter((letter: any) => {
        return !testPatterns.some(pattern => pattern.test(letter.recipient_name))
      })
      
      setResult(prev => prev + `📊 数据分析结果:\n`)
      setResult(prev => prev + `- 总Letters数: ${localLetters.length}\n`)
      setResult(prev => prev + `- 测试数据: ${testLetters.length}条\n`)
      setResult(prev => prev + `- 真实数据: ${realLetters.length}条\n\n`)
      
      if (testLetters.length > 0) {
        setResult(prev => prev + `🧪 检测到的测试数据:\n`)
        testLetters.forEach((letter: any, index: number) => {
          const date = new Date(letter.created_at).toLocaleString()
          setResult(prev => prev + `${index + 1}. To: ${letter.recipient_name} | ${letter.song_title} | ${date}\n`)
        })
        setResult(prev => prev + `\n`)
      }
      
      if (realLetters.length > 0) {
        setResult(prev => prev + `💌 真实Letters (将保留):\n`)
        realLetters.slice(0, 10).forEach((letter: any, index: number) => {
          const date = new Date(letter.created_at).toLocaleString()
          setResult(prev => prev + `${index + 1}. To: ${letter.recipient_name} | ${letter.song_title} | ${date}\n`)
        })
        if (realLetters.length > 10) {
          setResult(prev => prev + `... 还有 ${realLetters.length - 10} 条\n`)
        }
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 分析失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const cleanTestData = () => {
    if (!confirm('⚠️ 确定要删除所有测试数据吗？此操作不可逆！')) {
      return
    }
    
    setLoading(true)
    setResult('🧹 正在清理测试数据...\n\n')
    
    try {
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      const testPatterns = [
        /^测试用户_\d+$/,
        /^Test.*_\d+$/,
        /^test.*_\d+$/i,
        /^Database Test Recipient$/,
        /^测试.*$/
      ]
      
      const beforeCount = localLetters.length
      const cleanedLetters = localLetters.filter((letter: any) => {
        return !testPatterns.some(pattern => pattern.test(letter.recipient_name))
      })
      const afterCount = cleanedLetters.length
      const deletedCount = beforeCount - afterCount
      
      // 保存清理后的数据
      localStorage.setItem('letters', JSON.stringify(cleanedLetters))
      
      setResult(prev => prev + `✅ 清理完成!\n`)
      setResult(prev => prev + `- 删除测试数据: ${deletedCount}条\n`)
      setResult(prev => prev + `- 保留真实数据: ${afterCount}条\n\n`)
      
      if (deletedCount > 0) {
        setResult(prev => prev + `🔄 建议现在刷新History页面查看清理后的结果\n`)
        setResult(prev => prev + `📱 3秒后自动跳转到History页面...\n`)
        
        setTimeout(() => {
          window.location.href = '/history'
        }, 3000)
      } else {
        setResult(prev => prev + `ℹ️ 没有找到需要清理的测试数据\n`)
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 清理失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const cleanSpecificPattern = () => {
    const pattern = prompt('请输入要删除的收件人名称模式 (支持正则表达式):', '测试用户_')
    
    if (!pattern) return
    
    if (!confirm(`⚠️ 确定要删除所有包含 "${pattern}" 的Letters吗？此操作不可逆！`)) {
      return
    }
    
    setLoading(true)
    setResult(`🎯 正在删除包含 "${pattern}" 的Letters...\n\n`)
    
    try {
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      const beforeCount = localLetters.length
      
      let regex: RegExp
      try {
        regex = new RegExp(pattern, 'i')
      } catch {
        // 如果不是有效的正则表达式，就当作普通字符串处理
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }
      
      const cleanedLetters = localLetters.filter((letter: any) => {
        return !regex.test(letter.recipient_name)
      })
      
      const afterCount = cleanedLetters.length
      const deletedCount = beforeCount - afterCount
      
      if (deletedCount > 0) {
        localStorage.setItem('letters', JSON.stringify(cleanedLetters))
        setResult(prev => prev + `✅ 删除完成!\n`)
        setResult(prev => prev + `- 删除匹配数据: ${deletedCount}条\n`)
        setResult(prev => prev + `- 保留数据: ${afterCount}条\n\n`)
        setResult(prev => prev + `🔄 3秒后自动跳转到History页面...\n`)
        
        setTimeout(() => {
          window.location.href = '/history'
        }, 3000)
      } else {
        setResult(prev => prev + `ℹ️ 没有找到匹配 "${pattern}" 的Letters\n`)
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 删除失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>🧹 测试数据清理工具</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>⚠️ 说明</h3>
        <p>此工具可以识别并删除测试数据，如 "测试用户_xxxxxx" 格式的Letters。</p>
        <p><strong>检测规则：</strong></p>
        <ul>
          <li>测试用户_数字</li>
          <li>Test开头+数字</li>
          <li>Database Test Recipient</li>
          <li>其他测试开头的名称</li>
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={analyzeTestData}
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
          {loading ? '分析中...' : '🔍 分析测试数据'}
        </button>
        
        <button 
          onClick={cleanTestData}
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
          {loading ? '清理中...' : '🧹 清理测试数据'}
        </button>
        
        <button 
          onClick={cleanSpecificPattern}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#ffc107',
            color: '#212529',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          {loading ? '删除中...' : '🎯 自定义删除'}
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
        {result || '点击"分析测试数据"开始...'}
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
        <h4>使用步骤：</h4>
        <ol>
          <li><strong>分析测试数据</strong> - 查看哪些Letters会被删除</li>
          <li><strong>清理测试数据</strong> - 一键删除所有测试Letters</li>
          <li><strong>自定义删除</strong> - 指定特定模式进行删除</li>
        </ol>
        <p><strong>⚠️ 重要</strong>：删除操作不可逆，建议先分析确认后再清理。</p>
      </div>
    </div>
  )
}