'use client'

import { useState, useEffect } from 'react'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { useUserState } from '@/hooks/useUserState'

export default function FixLettersDisplay() {
  const [status, setStatus] = useState<string>('准备中...')
  const [letters, setLetters] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<any>({})
  
  const { user, isAuthenticated, isLoading } = useUserState()

  const diagnoseAndFix = async () => {
    setStatus('🔍 诊断问题...')
    
    try {
      // 1. 检查用户状态
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      
      console.log('👤 当前用户状态:', {
        hookUser: user?.email,
        hookAuth: isAuthenticated,
        serviceUser: currentUser?.email,
        serviceAuth: isAuth
      })
      
      if (!currentUser || !currentUser.id) {
        setStatus('❌ 用户ID缺失，尝试修复...')
        
        // 尝试从localStorage恢复完整用户信息
        const localUser = localStorage.getItem('user')
        if (localUser) {
          const parsedUser = JSON.parse(localUser)
          if (parsedUser && parsedUser.email && !parsedUser.id) {
            setStatus('🔧 检测到用户缺少ID，尝试重新获取...')
            
            // 强制重新初始化用户
            await userService.initializeUser()
            const refreshedUser = userService.getCurrentUser()
            
            if (refreshedUser && refreshedUser.id) {
              setStatus('✅ 用户ID修复成功')
            } else {
              setStatus('❌ 用户ID修复失败，使用匿名模式')
            }
          }
        }
      }
      
      // 2. 检查localStorage中的letters
      setStatus('📱 检查localStorage数据...')
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      console.log('💾 localStorage letters:', {
        count: localLetters.length,
        details: localLetters.map((l: any) => ({
          linkId: l.link_id,
          recipient: l.recipient_name,
          userId: l.user_id,
          anonymousId: l.anonymous_id
        }))
      })
      
      // 3. 获取最新用户信息
      const finalUser = userService.getCurrentUser()
      const anonymousId = userService.getAnonymousId()
      
      setStatus('🔍 分析用户letters匹配...')
      
      // 4. 过滤用户相关的letters
      let userLetters = []
      
      if (finalUser && finalUser.id) {
        // 已登录用户：匹配user_id或anonymous_id
        userLetters = localLetters.filter((letter: any) => {
          return letter.user_id === finalUser.id || 
                 (anonymousId && letter.anonymous_id === anonymousId) ||
                 (!letter.user_id && letter.anonymous_id === anonymousId)
        })
        
        console.log(`📋 已登录用户 ${finalUser.email} 的letters:`, userLetters.length)
      } else if (anonymousId) {
        // 匿名用户：匹配anonymous_id
        userLetters = localLetters.filter((letter: any) => 
          letter.anonymous_id === anonymousId
        )
        
        console.log(`👤 匿名用户 ${anonymousId} 的letters:`, userLetters.length)
      } else {
        // 无有效标识，显示所有letters
        userLetters = localLetters
        console.log('⚠️ 无有效用户标识，显示所有letters:', userLetters.length)
      }
      
      // 5. 如果没有找到letters，尝试数据库查询
      if (userLetters.length === 0 && finalUser && finalUser.id) {
        setStatus('📡 localStorage无数据，尝试数据库查询...')
        
        try {
          const dbLetters = await letterService.getUserLetters(50, 0)
          userLetters = dbLetters
          
          console.log('✅ 数据库查询成功:', dbLetters.length)
          setStatus(`✅ 从数据库获取到 ${dbLetters.length} 个letters`)
        } catch (dbError) {
          console.warn('❌ 数据库查询失败:', dbError)
          setStatus('❌ 数据库查询失败，使用localStorage数据')
        }
      }
      
      // 6. 排序并设置结果
      const sortedLetters = userLetters.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setLetters(sortedLetters)
      
      // 7. 汇总诊断信息
      setDebugInfo({
        用户状态: {
          Hook用户: user ? { id: user.id, email: user.email } : null,
          Hook认证: isAuthenticated,
          Service用户: finalUser ? { id: finalUser.id, email: finalUser.email } : null,
          Service认证: userService.isAuthenticated(),
          匿名ID: anonymousId
        },
        数据分析: {
          localStorage总数: localLetters.length,
          用户匹配数: userLetters.length,
          最终显示数: sortedLetters.length,
          数据源: sortedLetters.some(l => l.id && typeof l.id === 'string' && l.id.includes('-')) 
            ? '数据库' : 'localStorage'
        },
        修复建议: userLetters.length === 0 ? [
          '检查用户ID是否正确',
          '检查localStorage中的letters数据',
          '尝试重新登录',
          '清除缓存并重新加载'
        ] : ['数据正常']
      })
      
      if (sortedLetters.length > 0) {
        setStatus(`✅ 修复完成！找到 ${sortedLetters.length} 个letters`)
      } else {
        setStatus('⚠️ 未找到任何letters数据')
      }
      
    } catch (error) {
      console.error('💥 诊断过程出错:', error)
      setStatus(`❌ 诊断失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const forceShowAllLetters = () => {
    const allLetters = JSON.parse(localStorage.getItem('letters') || '[]')
    const sortedLetters = allLetters.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    setLetters(sortedLetters)
    setStatus(`🔧 强制显示所有letters: ${sortedLetters.length} 个`)
    
    // 设置永久标记
    localStorage.setItem('force_show_all_letters', 'true')
  }

  const fixUserIdIssue = async () => {
    setStatus('🔧 修复用户ID问题...')
    
    try {
      // 清除可能的错误标记
      localStorage.removeItem('supabase_auth_error')
      localStorage.removeItem('last_db_timeout')
      
      // 强制重新初始化用户
      await userService.initializeUser()
      
      // 等待一下让状态同步
      setTimeout(() => {
        diagnoseAndFix()
      }, 1000)
      
    } catch (error) {
      setStatus(`❌ 修复失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      diagnoseAndFix()
    }
  }, [isLoading])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔧 Letters显示问题修复工具</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📊 当前状态</h2>
        <p style={{ 
          padding: '1rem', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          {status}
        </p>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={diagnoseAndFix}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔍 重新诊断
        </button>
        
        <button 
          onClick={forceShowAllLetters}
          style={{
            padding: '12px 24px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔧 强制显示全部
        </button>
        
        <button 
          onClick={fixUserIdIssue}
          style={{
            padding: '12px 24px',
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔧 修复用户ID
        </button>
        
        <button 
          onClick={() => window.location.href = '/history'}
          style={{
            padding: '12px 24px',
            background: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          📋 返回History
        </button>
      </div>

      {Object.keys(debugInfo).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>🔍 诊断信息</h2>
          <pre style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #dee2e6'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <h2>📋 Letters列表 ({letters.length})</h2>
        {letters.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ color: '#666', margin: 0 }}>
              没有找到letters数据
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {letters.map((letter, index) => (
              <div key={index} style={{
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '1rem',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                {letter.song_album_cover && (
                  <img 
                    src={letter.song_album_cover} 
                    alt={letter.song_title}
                    style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>
                    To: {letter.recipient_name}
                  </h3>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                    {letter.song_title} - {letter.song_artist}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    {new Date(letter.created_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    color: letter.id && typeof letter.id === 'string' && letter.id.includes('-') 
                      ? '#007bff' : '#28a745',
                    fontWeight: 'bold'
                  }}>
                    {letter.id && typeof letter.id === 'string' && letter.id.includes('-') 
                      ? '📡 数据库' : '💾 本地'}
                  </span>
                  <button
                    onClick={() => window.location.href = `/letter/${letter.link_id}`}
                    style={{
                      padding: '6px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    查看
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}