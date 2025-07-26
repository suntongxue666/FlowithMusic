'use client'

import { useState } from 'react'
import { letterService } from '@/lib/letterService'
import { supabase } from '@/lib/supabase'

export default function TestDatabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testCreateAndVerify = async () => {
    setLoading(true)
    setResult('🧪 开始完整的Letter创建和数据库验证测试...\n\n')
    
    try {
      // 1. 检查Supabase连接状态
      setResult(prev => prev + '1️⃣ 检查Supabase连接状态...\n')
      
      if (!supabase) {
        setResult(prev => prev + '❌ Supabase未初始化\n\n')
        return
      }
      
      try {
        const { error } = await supabase.from('letters').select('count').limit(1)
        if (error) {
          setResult(prev => prev + `❌ Supabase连接失败: ${error.message}\n\n`)
        } else {
          setResult(prev => prev + '✅ Supabase连接正常\n\n')
        }
      } catch (e) {
        setResult(prev => prev + `❌ Supabase连接异常: ${e instanceof Error ? e.message : 'Unknown'}\n\n`)
      }
      
      // 2. 创建测试Letter
      setResult(prev => prev + '2️⃣ 创建测试Letter...\n')
      
      const testLetter = await letterService.createLetter({
        to: `测试用户_${Date.now()}`,
        message: 'This is a comprehensive database test message to verify that our Letter creation process works correctly and data is properly stored in Supabase database or fallback storage systems.',
        song: {
          id: `test_${Date.now()}`,
          title: 'Database Test Song',
          artist: 'Test Database Artist',
          albumCover: 'https://via.placeholder.com/300x300/1DB954/ffffff?text=DB+Test',
          spotifyUrl: 'https://open.spotify.com/track/test_db_song'
        }
      })
      
      setResult(prev => prev + `✅ Letter创建成功\n`)
      setResult(prev => prev + `📝 Link ID: ${testLetter.link_id}\n`)
      setResult(prev => prev + `🆔 Letter ID: ${testLetter.id}\n`)
      setResult(prev => prev + `👤 User ID: ${testLetter.user_id || 'NULL'}\n`)
      setResult(prev => prev + `👻 Anonymous ID: ${testLetter.anonymous_id || 'NULL'}\n\n`)
      
      // 3. 验证Supabase数据库中是否存在
      setResult(prev => prev + '3️⃣ 验证Supabase数据库写入...\n')
      
      let supabaseData = null
      try {
        const { data: dbData, error: supabaseError } = await supabase
          .from('letters')
          .select('*')
          .eq('link_id', testLetter.link_id)
          .single()
        
        if (supabaseError) {
          setResult(prev => prev + `❌ Supabase查询失败: ${supabaseError.message}\n`)
          setResult(prev => prev + `📋 错误详情: ${JSON.stringify(supabaseError, null, 2)}\n`)
        } else if (dbData) {
          supabaseData = dbData
          setResult(prev => prev + `✅ 数据成功写入Supabase\n`)
          setResult(prev => prev + `📊 数据库记录: ${dbData.recipient_name} | ${dbData.song_title}\n`)
        } else {
          setResult(prev => prev + `⚠️ Supabase中未找到数据\n`)
        }
      } catch (dbError) {
        setResult(prev => prev + `❌ 数据库查询异常: ${dbError instanceof Error ? dbError.message : 'Unknown'}\n`)
      }
      
      setResult(prev => prev + '\n')
      
      // 4. 检查localStorage
      setResult(prev => prev + '4️⃣ 检查localStorage存储...\n')
      
      if (typeof window !== 'undefined') {
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const localLetter = localLetters.find((l: any) => l.link_id === testLetter.link_id)
        
        if (localLetter) {
          setResult(prev => prev + `✅ 数据存在于localStorage\n`)
          setResult(prev => prev + `📱 本地记录: ${localLetter.recipient_name} | ${localLetter.song_title}\n`)
        } else {
          setResult(prev => prev + `❌ localStorage中未找到数据\n`)
        }
      } else {
        setResult(prev => prev + `⚠️ 无法访问localStorage (服务器端)\n`)
      }
      
      setResult(prev => prev + '\n')
      
      // 5. 测试Letter访问功能
      setResult(prev => prev + '5️⃣ 测试Letter访问功能...\n')
      
      const retrievedLetter = await letterService.getLetterByLinkId(testLetter.link_id)
      
      if (retrievedLetter) {
        setResult(prev => prev + `✅ Letter可以正常访问\n`)
        setResult(prev => prev + `📖 访问结果: ${retrievedLetter.recipient_name} -> ${retrievedLetter.song_title}\n`)
        
        if (retrievedLetter.id === testLetter.id) {
          setResult(prev => prev + `✅ 数据完整性验证通过\n`)
        } else {
          setResult(prev => prev + `⚠️ 数据完整性可能有问题\n`)
        }
      } else {
        setResult(prev => prev + `❌ Letter无法访问，这是严重问题！\n`)
      }
      
      setResult(prev => prev + '\n')
      
      // 6. 检查首页是否显示
      setResult(prev => prev + '6️⃣ 检查首页数据显示...\n')
      
      const publicLetters = await letterService.getPublicLetters(20, 0, 'created_at')
      const foundInHomepage = publicLetters.find(l => l.link_id === testLetter.link_id)
      
      if (foundInHomepage) {
        setResult(prev => prev + `✅ Letter出现在首页数据中\n`)
        
        // 检查是否符合首页显示条件
        const wordCount = foundInHomepage.message.trim().split(/\s+/).length
        if (wordCount >= 12) {
          setResult(prev => prev + `✅ 符合首页显示条件 (${wordCount}个单词)\n`)
        } else {
          setResult(prev => prev + `⚠️ 不符合首页显示条件 (${wordCount}个单词，需要≥12)\n`)
        }
      } else {
        setResult(prev => prev + `❌ Letter未出现在首页数据中\n`)
      }
      
      setResult(prev => prev + '\n')
      
      // 7. 总结
      setResult(prev => prev + '📋 测试总结:\n')
      setResult(prev => prev + '- Letter创建: ✅\n')
      setResult(prev => prev + `- 数据库存储: ${supabaseData ? '✅' : '❌'}\n`)
      setResult(prev => prev + `- 本地存储: ${typeof window !== 'undefined' && JSON.parse(localStorage.getItem('letters') || '[]').find((l: any) => l.link_id === testLetter.link_id) ? '✅' : '❌'}\n`)
      setResult(prev => prev + `- Letter访问: ${retrievedLetter ? '✅' : '❌'}\n`)
      setResult(prev => prev + `- 首页显示: ${foundInHomepage ? '✅' : '❌'}\n`)
      
    } catch (error) {
      console.error('Test failed:', error)
      setResult(prev => prev + `\n❌ 测试失败: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
      setResult(prev => prev + `堆栈跟踪: ${error instanceof Error ? error.stack : 'No stack trace'}\n`)
    }
    
    setLoading(false)
  }

  const checkSupabaseDirectly = async () => {
    setLoading(true)
    setResult('🔍 直接检查Supabase数据库内容...\n\n')
    
    try {
      if (!supabase) {
        setResult(prev => prev + '❌ Supabase未初始化\n')
        return
      }
      
      // 获取最近的10条记录
      const { data: recentLetters, error } = await supabase
        .from('letters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        setResult(prev => prev + `❌ 查询失败: ${error.message}\n`)
        setResult(prev => prev + `错误详情: ${JSON.stringify(error, null, 2)}\n`)
      } else {
        setResult(prev => prev + `✅ 查询成功，找到 ${recentLetters?.length || 0} 条记录\n\n`)
        
        if (recentLetters && recentLetters.length > 0) {
          setResult(prev => prev + '📊 最近的Letters:\n')
          recentLetters.forEach((letter, i) => {
            const date = new Date(letter.created_at).toLocaleString()
            setResult(prev => prev + `${i+1}. ${letter.recipient_name} | ${letter.song_title} | ${date}\n`)
            setResult(prev => prev + `   Link: /letter/${letter.link_id}\n`)
            setResult(prev => prev + `   Public: ${letter.is_public ? 'Yes' : 'No'}\n\n`)
          })
        } else {
          setResult(prev => prev + '📝 数据库为空或无public数据\n')
        }
        
        // 统计信息
        const { data: stats } = await supabase
          .from('letters')
          .select('id, is_public, created_at')
        
        if (stats) {
          const total = stats.length
          const publicCount = stats.filter(l => l.is_public).length
          const today = new Date().toDateString()
          const todayCount = stats.filter(l => new Date(l.created_at).toDateString() === today).length
          
          setResult(prev => prev + `📈 统计信息:\n`)
          setResult(prev => prev + `- 总计: ${total} Letters\n`)
          setResult(prev => prev + `- 公开: ${publicCount} Letters\n`)
          setResult(prev => prev + `- 今日: ${todayCount} Letters\n`)
        }
      }
      
    } catch (error) {
      setResult(prev => prev + `❌ 检查失败: ${error instanceof Error ? error.message : 'Unknown'}\n`)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>📊 数据库验证工具 (新数据库)</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={testCreateAndVerify}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? '测试中...' : '🧪 完整创建+验证测试'}
        </button>
        
        <button 
          onClick={checkSupabaseDirectly}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '查询中...' : '🔍 直接查询数据库'}
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
        {result || '点击按钮开始测试...'}
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
        <p><strong>使用说明：</strong></p>
        <ul>
          <li><strong>完整测试</strong>：创建新Letter并验证所有存储和访问流程</li>
          <li><strong>直接查询</strong>：查看Supabase数据库中的现有数据</li>
          <li>测试结果会显示数据是否成功写入Supabase、localStorage等</li>
        </ul>
      </div>
    </div>
  )
}