'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { cacheManager } from '@/lib/cacheManager'
import { supabase } from '@/lib/supabase'

export default function CleanCachePage() {
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)
  const [result, setResult] = useState('')

  const handleCompleteReset = async () => {
    setIsClearing(true)
    setResult('')
    
    try {
      let deletedLetters = 0
      let deletedUsers = 0
      
      // 1. 清理Supabase数据库
      if (supabase) {
        console.log('🗑️ 清理Supabase数据库...')
        
        // 删除所有letters
        const { data: letters, error: lettersError } = await supabase
          .from('letters')
          .delete()
          .neq('id', 'impossible-id') // 删除所有记录的技巧
        
        if (!lettersError) {
          console.log('✅ 已删除所有Letters')
        }
        
        // 可选：删除除了当前用户外的所有用户数据
        // 保留当前登录用户，删除其他测试用户
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error: usersError } = await supabase
            .from('users')
            .delete()
            .neq('id', user.id)
          
          if (!usersError) {
            console.log('✅ 已清理测试用户数据')
          }
        }
      }
      
      // 2. 清理所有本地缓存
      cacheManager.clear()
      
      // 3. 清理localStorage（保留基本配置）
      const keysToKeep = ['theme', 'language'] // 只保留基本设置
      const allKeys = Object.keys(localStorage)
      
      let cleanedCount = 0
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
          cleanedCount++
        }
      })
      
      // 4. 重新初始化用户身份
      const newAnonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('anonymous_id', newAnonymousId)
      
      setResult(`🎉 完全重置成功！

已清理：
✅ 所有Supabase Letters数据
✅ 测试用户数据（保留当前登录用户）
✅ 所有本地缓存 (${cleanedCount} 个项目)
✅ 生成新的匿名用户ID: ${newAnonymousId.substr(0, 20)}...

现在你有一个完全干净的系统，可以按新的用户身份规则重新开始！`)
      
      setTimeout(() => {
        // 延迟跳转，让用户看到结果
        window.location.href = '/history'
      }, 4000)
      
    } catch (error) {
      console.error('完全重置失败:', error)
      setResult(`❌ 重置失败: ${error instanceof Error ? error.message : '未知错误'}

请检查：
- 是否有数据库连接权限
- 网络是否正常
- 刷新页面重试`)
    } finally {
      setIsClearing(false)
    }
  }

  const handleSafeReset = async () => {
    setIsClearing(true)
    setResult('')
    
    try {
      // 只清理本地数据，保留Supabase
      cacheManager.clear()
      
      const currentAnonymousId = localStorage.getItem('anonymous_id')
      
      // 清理所有localStorage
      localStorage.clear()
      
      // 重新生成匿名ID
      const newAnonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('anonymous_id', newAnonymousId)
      
      setResult(`✅ 本地数据重置完成！

已完成：
🗑️ 清理了所有本地缓存和数据
🆔 生成新匿名ID: ${newAnonymousId.substr(0, 20)}...
💾 保留了Supabase数据库数据

系统将重新按新规则加载数据。`)
      
      setTimeout(() => {
        router.push('/history')
      }, 3000)
      
    } catch (error) {
      console.error('本地重置失败:', error)
      setResult(`❌ 重置失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main>
      <Header />
      <div style={{ 
        maxWidth: '700px', 
        margin: '2rem auto', 
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '2rem' }}>🧹 数据重置工具</h1>
        
        <div style={{ 
          background: '#e8f5e8', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#28a745', marginBottom: '1rem' }}>🎯 完全重置（推荐）</h3>
          <p style={{ marginBottom: '1rem', color: '#155724' }}>
            既然网站刚上线，只有你一个用户，建议使用完全重置：
          </p>
          <ul style={{ color: '#155724', marginBottom: '1rem' }}>
            <li>🗑️ 删除所有Supabase Letters数据</li>
            <li>👤 清理测试用户数据（保留你的登录）</li>
            <li>💾 清理所有本地缓存</li>
            <li>🆔 重新生成用户身份</li>
            <li>🎉 获得完全干净的系统</li>
          </ul>
          <p style={{ color: '#28a745', fontSize: '0.9rem', fontWeight: 'bold' }}>
            这样可以确保新的用户身份规则从头开始完美运行！
          </p>
        </div>

        <div style={{ 
          background: '#fff3cd', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#856404', marginBottom: '1rem' }}>🔧 仅本地重置</h3>
          <p style={{ marginBottom: '1rem', color: '#856404' }}>
            如果你想保留数据库中的测试数据：
          </p>
          <ul style={{ color: '#856404' }}>
            <li>只清理本地缓存和localStorage</li>
            <li>保留Supabase中的所有数据</li>
            <li>重新生成匿名用户ID</li>
          </ul>
        </div>

        {!result && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCompleteReset}
              disabled={isClearing}
              style={{
                padding: '1rem 2rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isClearing ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                opacity: isClearing ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {isClearing ? '🔄 重置中...' : '🎯 完全重置（推荐）'}
            </button>
            
            <button
              onClick={handleSafeReset}
              disabled={isClearing}
              style={{
                padding: '1rem 2rem',
                background: '#FFC107',
                color: '#212529',
                border: 'none',
                borderRadius: '8px',
                cursor: isClearing ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                opacity: isClearing ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {isClearing ? '🔄 处理中...' : '🔧 仅本地重置'}
            </button>
          </div>
        )}

        {result && (
          <div style={{
            background: result.includes('🎉') || result.includes('✅') ? '#d4edda' : '#f8d7da',
            color: result.includes('🎉') || result.includes('✅') ? '#155724' : '#721c24',
            padding: '2rem',
            borderRadius: '8px',
            whiteSpace: 'pre-line',
            textAlign: 'left',
            fontSize: '1rem',
            lineHeight: '1.6'
          }}>
            {result}
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <button
            onClick={() => router.push('/history')}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            返回 History
          </button>
        </div>
      </div>
    </main>
  )
}