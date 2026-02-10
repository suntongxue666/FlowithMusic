'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { userService } from '@/lib/userService'

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const checkAuthState = async () => {
    setLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      supabaseAuth: null,
      userServiceState: null,
      localStorage: null,
      databaseUser: null,
      errors: []
    }

    try {
      // 1. 检查Supabase认证状态
      console.log('🔍 检查Supabase认证状态...')
      if (!supabase) {
        results.errors.push('Supabase客户端不可用')
        setAuthState(results)
        setLoading(false)
        return
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      results.supabaseAuth = {
        hasSession: !!session,
        sessionUser: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata
        } : null,
        authUser: user ? {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata
        } : null,
        sessionError,
        userError
      }

      // 2. 检查UserService状态
      console.log('🔍 检查UserService状态...')
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      const anonymousId = userService.getAnonymousId()

      results.userServiceState = {
        currentUser: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url
        } : null,
        isAuthenticated: isAuth,
        anonymousId
      }

      // 3. 检查localStorage
      console.log('🔍 检查localStorage...')
      const storedUser = localStorage.getItem('user')
      const storedAuth = localStorage.getItem('isAuthenticated')
      const storedAnonymousId = localStorage.getItem('anonymous_id')

      results.localStorage = {
        hasUser: !!storedUser,
        user: storedUser ? JSON.parse(storedUser) : null,
        isAuthenticated: storedAuth,
        anonymousId: storedAnonymousId,
        allKeys: Object.keys(localStorage).filter(key => 
          key.includes('user') || key.includes('auth') || key.includes('sb-')
        )
      }

      // 4. 如果有认证用户，直接查询数据库
      if (user) {
        console.log('🔍 查询数据库用户数据...')
        try {
          const { data: dbUser, error: dbError } = await supabase!
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          results.databaseUser = {
            found: !!dbUser,
            user: dbUser,
            error: dbError
          }
        } catch (dbError) {
          results.errors.push(`数据库查询错误: ${dbError}`)
        }
      }

    } catch (error) {
      results.errors.push(`检查过程错误: ${error}`)
    }

    setAuthState(results)
    setLoading(false)
  }

  const testFetchAndCache = async () => {
    console.log('🧪 测试fetchAndCacheUser方法...')
    try {
      const fetchedUser = await userService.fetchAndCacheUser()
      console.log('✅ fetchAndCacheUser结果:', fetchedUser)
      
      // 重新检查状态
      await checkAuthState()
      
      if (fetchedUser) {
        alert(`成功获取用户: ${fetchedUser.email}`)
      } else {
        alert('未能获取用户数据')
      }
    } catch (error) {
      console.error('❌ fetchAndCacheUser失败:', error)
      alert(`获取用户失败: ${error}`)
    }
  }

  const clearAllData = () => {
    console.log('🧹 清除所有数据...')
    
    // 清除localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('user') || key.includes('auth') || key.includes('sb-') || key.includes('anonymous')
    )
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // 清除userService状态
    userService.forceSignOut()
    
    console.log(`✅ 已清除 ${keysToRemove.length} 个localStorage项目`)
    
    // 重新检查状态
    checkAuthState()
  }

  const forceLogin = async () => {
    console.log('🔐 强制登录...')
    try {
      await userService.signInWithGoogle()
    } catch (error) {
      console.error('❌ 强制登录失败:', error)
      alert(`登录失败: ${error}`)
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 认证状态调试</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={checkAuthState} disabled={loading}>
          🔄 刷新状态
        </button>
        <button onClick={testFetchAndCache}>
          🧪 测试获取用户
        </button>
        <button onClick={clearAllData}>
          🧹 清除所有数据
        </button>
        <button onClick={forceLogin}>
          🔐 强制登录
        </button>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : authState ? (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2>📊 诊断结果</h2>
            <div style={{ 
              padding: '1rem', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h3>🎯 问题诊断：</h3>
              <ul style={{ marginLeft: '1rem' }}>
                <li style={{ color: authState.supabaseAuth?.hasSession ? 'green' : 'red' }}>
                  Supabase会话: {authState.supabaseAuth?.hasSession ? '✅ 存在' : '❌ 不存在'}
                </li>
                <li style={{ color: authState.supabaseAuth?.authUser ? 'green' : 'red' }}>
                  Supabase用户: {authState.supabaseAuth?.authUser ? '✅ 存在' : '❌ 不存在'}
                </li>
                <li style={{ color: authState.databaseUser?.found ? 'green' : 'red' }}>
                  数据库用户: {authState.databaseUser?.found ? '✅ 存在' : '❌ 不存在'}
                </li>
                <li style={{ color: authState.userServiceState?.currentUser ? 'green' : 'red' }}>
                  UserService用户: {authState.userServiceState?.currentUser ? '✅ 存在' : '❌ 不存在'}
                </li>
                <li style={{ color: authState.localStorage?.hasUser ? 'green' : 'red' }}>
                  localStorage用户: {authState.localStorage?.hasUser ? '✅ 存在' : '❌ 不存在'}
                </li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            
            {/* Supabase认证状态 */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>🔐 Supabase认证状态</h3>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(authState.supabaseAuth, null, 2)}
              </pre>
            </div>

            {/* UserService状态 */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>⚙️ UserService状态</h3>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(authState.userServiceState, null, 2)}
              </pre>
            </div>

            {/* localStorage状态 */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>💾 localStorage状态</h3>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(authState.localStorage, null, 2)}
              </pre>
            </div>

            {/* 数据库用户 */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>🗄️ 数据库用户</h3>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(authState.databaseUser, null, 2)}
              </pre>
            </div>

          </div>

          {/* 错误信息 */}
          {authState.errors.length > 0 && (
            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              background: '#fee', 
              borderRadius: '8px',
              border: '1px solid #fcc'
            }}>
              <h3>❌ 错误信息</h3>
              <ul>
                {authState.errors.map((error: string, index: number) => (
                  <li key={index} style={{ color: 'red' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: '#e8f4fd', 
            borderRadius: '8px',
            border: '1px solid #bee5eb'
          }}>
            <h3>💡 解决建议</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {!authState.supabaseAuth?.hasSession && (
                <p>🔴 <strong>没有Supabase会话</strong> - 需要重新登录</p>
              )}
              {authState.supabaseAuth?.hasSession && !authState.databaseUser?.found && (
                <p>🟡 <strong>有会话但数据库无用户</strong> - 用户创建可能失败</p>
              )}
              {authState.supabaseAuth?.hasSession && authState.databaseUser?.found && !authState.userServiceState?.currentUser && (
                <p>🟠 <strong>数据库有用户但UserService无数据</strong> - 缓存同步问题</p>
              )}
              {authState.userServiceState?.currentUser && !authState.localStorage?.hasUser && (
                <p>🟢 <strong>UserService有数据但localStorage无数据</strong> - 需要重新缓存</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>无数据</div>
      )}
    </div>
  )
}