'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

export default function TestGoogleOAuth() {
  const [logs, setLogs] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  // 检查当前用户状态
  const checkUserStatus = () => {
    addLog('🔍 检查当前用户状态...')
    
    const user = userService.getCurrentUser()
    const isAuth = userService.isAuthenticated()
    const anonymousId = userService.getAnonymousId()
    
    setCurrentUser(user)
    
    addLog(`当前用户: ${user ? user.email : '未登录'}`)
    addLog(`认证状态: ${isAuth ? '✅ 已认证' : '❌ 未认证'}`)
    addLog(`匿名ID: ${anonymousId || '无'}`)
    
    if (user) {
      addLog(`用户详情:`)
      addLog(`  - ID: ${user.id}`)
      addLog(`  - 邮箱: ${user.email}`)
      addLog(`  - 显示名: ${user.display_name || '无'}`)
      addLog(`  - 头像: ${user.avatar_url ? '有' : '无'}`)
      addLog(`  - Google ID: ${user.google_id || '无'}`)
    }

    // 检查localStorage
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      const storedAuth = localStorage.getItem('isAuthenticated')
      addLog(`localStorage状态:`)
      addLog(`  - 用户数据: ${storedUser ? '有' : '无'}`)
      addLog(`  - 认证标记: ${storedAuth}`)
    }
  }

  // 测试Google登录
  const testGoogleLogin = async () => {
    try {
      setIsLoading(true)
      addLog('🔑 开始Google OAuth登录...')
      
      // 检查Supabase配置
      if (!supabase) {
        addLog('❌ Supabase客户端未初始化')
        return
      }

      addLog('🔧 当前配置:')
      addLog(`  - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      addLog(`  - 当前域名: ${window.location.origin}`)
      addLog(`  - 重定向URI: ${window.location.origin}/auth/callback`)
      
      await userService.signInWithGoogle()
      addLog('✅ OAuth请求已发送，等待重定向...')
      
    } catch (error: any) {
      addLog(`❌ Google登录失败: ${error.message}`)
      
      if (error.message?.includes('redirect_uri_mismatch')) {
        addLog('💡 解决方案: 请在Google Cloud Console中添加重定向URI:')
        addLog(`   ${window.location.origin}/auth/callback`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 强制登出
  const forceSignOut = () => {
    addLog('🚪 强制登出...')
    userService.forceSignOut()
    setCurrentUser(null)
    addLog('✅ 登出完成')
    
    // 重新检查状态
    setTimeout(checkUserStatus, 500)
  }

  // 检查Supabase会话
  const checkSupabaseSession = async () => {
    try {
      addLog('🔍 检查Supabase会话...')
      
      if (!supabase) {
        addLog('❌ Supabase不可用')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        addLog(`❌ 获取会话失败: ${error.message}`)
      } else if (session) {
        addLog('✅ 找到有效会话:')
        addLog(`  - 用户ID: ${session.user.id}`)
        addLog(`  - 邮箱: ${session.user.email}`)
        addLog(`  - 用户元数据: ${JSON.stringify(session.user.user_metadata)}`)
        addLog(`  - 过期时间: ${new Date(session.expires_at! * 1000).toLocaleString()}`)
        
        // 检查数据库中的用户记录
        addLog('🔍 检查数据库中的用户记录...')
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (dbError) {
          addLog(`❌ 数据库查询失败: ${dbError.message}`)
        } else if (dbUser) {
          addLog('✅ 数据库中的用户记录:')
          addLog(`  - ID: ${dbUser.id}`)
          addLog(`  - 邮箱: ${dbUser.email || '空'}`)
          addLog(`  - 显示名: ${dbUser.display_name || '空'}`)
          addLog(`  - 头像: ${dbUser.avatar_url || '空'}`)
          addLog(`  - Google ID: ${dbUser.google_id || '空'}`)
          addLog(`  - 匿名ID: ${dbUser.anonymous_id || '空'}`)
        } else {
          addLog('❌ 数据库中未找到用户记录')
        }
        
        // 如果有会话但本地没有用户，尝试处理
        if (!currentUser) {
          addLog('🔄 发现会话但本地无用户，尝试处理...')
          try {
            const processedUser = await userService.handleAuthCallback(session.user)
            setCurrentUser(processedUser)
            addLog('✅ 会话用户处理完成')
            addLog(`处理后的用户: ${JSON.stringify(processedUser)}`)
          } catch (processError) {
            addLog(`❌ 处理会话用户失败: ${processError}`)
          }
        }
      } else {
        addLog('❌ 无有效会话')
      }
    } catch (error) {
      addLog(`❌ 检查会话异常: ${error}`)
    }
  }

  // 测试数据库连接
  const testDatabaseConnection = async () => {
    try {
      addLog('🔍 测试数据库连接...')
      
      if (!supabase) {
        addLog('❌ Supabase不可用')
        return
      }

      // 查询users表
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(5)
      
      if (error) {
        addLog(`❌ 数据库查询失败: ${error.message}`)
      } else {
        addLog(`✅ 数据库连接正常，users表共有 ${count} 条记录`)
        if (data && data.length > 0) {
          addLog('最近的用户:')
          data.forEach((user, index) => {
            addLog(`  ${index + 1}. ${user.email || '无邮箱'} (${user.display_name || '无显示名'})`)
          })
        }
      }
    } catch (error) {
      addLog(`❌ 数据库测试异常: ${error}`)
    }
  }

  // 手动修复用户数据
  const fixUserData = async () => {
    try {
      addLog('🔧 开始修复用户数据...')
      
      if (!supabase) {
        addLog('❌ Supabase不可用')
        return
      }

      // 获取当前会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        addLog('❌ 无有效会话，请先登录')
        return
      }

      const user = session.user
      addLog(`🔍 当前会话用户: ${user.email}`)
      addLog(`🔍 用户元数据: ${JSON.stringify(user.user_metadata)}`)

      // 更新用户数据
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email: user.email,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          social_media_info: user.user_metadata || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        addLog(`❌ 更新用户数据失败: ${updateError.message}`)
      } else {
        addLog('✅ 用户数据更新成功:')
        addLog(`  - 邮箱: ${updatedUser.email}`)
        addLog(`  - 显示名: ${updatedUser.display_name}`)
        addLog(`  - 头像: ${updatedUser.avatar_url ? '有' : '无'}`)
        
        // 重新处理用户数据
        const processedUser = await userService.handleAuthCallback(user)
        setCurrentUser(processedUser)
        addLog('✅ 本地用户状态已更新')
      }
    } catch (error) {
      addLog(`❌ 修复用户数据异常: ${error}`)
    }
  }

  useEffect(() => {
    addLog('🚀 Google OAuth测试页面加载完成')
    checkUserStatus()
    
    // 检查URL参数，看是否是登录回调
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('login') === 'success') {
      addLog('🎉 检测到登录成功回调')
      setTimeout(checkUserStatus, 1000)
    } else if (urlParams.get('login') === 'error') {
      addLog('❌ 检测到登录失败回调')
    }
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google OAuth 登录测试</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 控制面板 */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">测试操作</h2>
            <div className="space-y-2">
              <button
                onClick={checkUserStatus}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                检查用户状态
              </button>
              
              <button
                onClick={testGoogleLogin}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {isLoading ? '登录中...' : '测试Google登录'}
              </button>
              
              <button
                onClick={checkSupabaseSession}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                检查Supabase会话
              </button>
              
              <button
                onClick={testDatabaseConnection}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                测试数据库连接
              </button>
              
              <button
                onClick={fixUserData}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                修复用户数据
              </button>
              
              <button
                onClick={forceSignOut}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                强制登出
              </button>
            </div>
          </div>

          {/* 状态显示 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">当前状态</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>登录状态:</span>
                <span className={currentUser ? 'text-green-600' : 'text-red-600'}>
                  {currentUser ? '✅ 已登录' : '❌ 未登录'}
                </span>
              </div>
              {currentUser && (
                <>
                  <div className="flex justify-between">
                    <span>用户邮箱:</span>
                    <span className="text-blue-600">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>显示名:</span>
                    <span>{currentUser.display_name || '无'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>头像:</span>
                    <span>{currentUser.avatar_url ? '✅ 有' : '❌ 无'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 配置信息 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">配置检查</h2>
            <div className="space-y-1 text-xs font-mono">
              <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
              <div>当前域名: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</div>
              <div>重定向URI: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* 日志显示 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">测试日志</h2>
          <div className="bg-gray-100 p-3 rounded h-96 overflow-y-auto">
            <div className="space-y-1 text-sm font-mono">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-800">
                  {log}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            清空日志
          </button>
        </div>
      </div>

      {/* 用户头像显示 */}
      {currentUser && currentUser.avatar_url && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow text-center">
          <h2 className="text-lg font-semibold mb-3">用户头像</h2>
          <img 
            src={currentUser.avatar_url} 
            alt="用户头像" 
            className="w-20 h-20 rounded-full mx-auto"
          />
          <p className="mt-2 text-sm text-gray-600">
            {currentUser.display_name} ({currentUser.email})
          </p>
        </div>
      )}

      {/* 帮助信息 */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">测试步骤:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>点击"检查用户状态"查看当前登录状态</li>
          <li>点击"测试数据库连接"确认数据库正常</li>
          <li>点击"测试Google登录"进行OAuth登录</li>
          <li>登录成功后会自动重定向回来</li>
          <li>再次检查用户状态确认登录成功</li>
        </ol>
      </div>
    </div>
  )
}