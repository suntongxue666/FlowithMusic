'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { userService } from '@/lib/userService'

export default function TestUserSync() {
  const [logs, setLogs] = useState<string[]>([])
  const [authUsers, setAuthUsers] = useState<any[]>([])
  const [customUsers, setCustomUsers] = useState<any[]>([])
  const [triggerExists, setTriggerExists] = useState<boolean | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  // 检查触发器是否存在
  const checkTrigger = async () => {
    try {
      addLog('🔍 检查数据库触发器状态...')
      
      const { data, error } = await supabase
        .from('information_schema.triggers')
        .select('*')
        .eq('trigger_name', 'sync_auth_user_trigger')
      
      if (error) {
        addLog(`❌ 检查触发器失败: ${error.message}`)
        setTriggerExists(false)
      } else {
        const exists = data && data.length > 0
        setTriggerExists(exists)
        addLog(`${exists ? '✅' : '❌'} 触发器${exists ? '存在' : '不存在'}`)
      }
    } catch (error) {
      addLog(`❌ 检查触发器异常: ${error}`)
      setTriggerExists(false)
    }
  }

  // 获取auth.users中的用户
  const getAuthUsers = async () => {
    try {
      addLog('🔍 获取auth.users中的用户...')
      
      // 注意：这个查询可能需要特殊权限
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        addLog(`❌ 获取auth用户失败: ${error.message}`)
      } else {
        setAuthUsers(users || [])
        addLog(`✅ 找到 ${users?.length || 0} 个auth用户`)
        users?.forEach((user, index) => {
          addLog(`   ${index + 1}. ${user.email} (ID: ${user.id})`)
        })
      }
    } catch (error) {
      addLog(`❌ 获取auth用户异常: ${error}`)
    }
  }

  // 获取自定义users表中的用户
  const getCustomUsers = async () => {
    try {
      addLog('🔍 获取自定义users表中的用户...')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        addLog(`❌ 获取自定义用户失败: ${error.message}`)
      } else {
        setCustomUsers(data || [])
        addLog(`✅ 找到 ${data?.length || 0} 个自定义用户`)
        data?.forEach((user, index) => {
          addLog(`   ${index + 1}. ${user.email} (ID: ${user.id}, Google ID: ${user.google_id})`)
        })
      }
    } catch (error) {
      addLog(`❌ 获取自定义用户异常: ${error}`)
    }
  }

  // 获取当前用户状态
  const getCurrentUserStatus = () => {
    addLog('🔍 检查当前用户状态...')
    
    const user = userService.getCurrentUser()
    const isAuth = userService.isAuthenticated()
    const anonymousId = userService.getAnonymousId()
    
    setCurrentUser(user)
    
    addLog(`当前用户: ${user ? user.email : '未登录'}`)
    addLog(`认证状态: ${isAuth ? '已认证' : '未认证'}`)
    addLog(`匿名ID: ${anonymousId || '无'}`)
    
    if (user) {
      addLog(`用户详情: ID=${user.id}, 显示名=${user.display_name}, 头像=${user.avatar_url ? '有' : '无'}`)
    }
  }

  // 手动创建触发器
  const createTrigger = async () => {
    try {
      addLog('🔧 开始创建用户同步触发器...')
      
      // 执行触发器创建SQL
      const triggerSQL = `
        -- 创建触发器函数
        CREATE OR REPLACE FUNCTION sync_user_to_custom_table()
        RETURNS TRIGGER AS $$
        DECLARE
          user_anonymous_id TEXT;
        BEGIN
          user_anonymous_id := 'anon_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 0, 9);
          
          IF TG_OP = 'INSERT' THEN
            INSERT INTO public.users (
              id,
              email,
              google_id,
              anonymous_id,
              display_name,
              avatar_url,
              user_agent,
              social_media_info,
              coins,
              is_premium,
              created_at,
              updated_at
            ) VALUES (
              NEW.id,
              NEW.email,
              NEW.id::text,
              user_anonymous_id,
              COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name', 
                split_part(NEW.email, '@', 1)
              ),
              NEW.raw_user_meta_data->>'avatar_url',
              NEW.raw_user_meta_data->>'user_agent',
              COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
              100,
              FALSE,
              NEW.created_at,
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              avatar_url = EXCLUDED.avatar_url,
              social_media_info = EXCLUDED.social_media_info,
              updated_at = NOW();
              
            RETURN NEW;
          END IF;
          
          IF TG_OP = 'UPDATE' THEN
            UPDATE public.users SET
              email = NEW.email,
              display_name = COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name', 
                split_part(NEW.email, '@', 1)
              ),
              avatar_url = NEW.raw_user_meta_data->>'avatar_url',
              social_media_info = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
              updated_at = NOW()
            WHERE id = NEW.id;
            
            RETURN NEW;
          END IF;
          
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- 删除旧触发器
        DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;

        -- 创建新触发器
        CREATE TRIGGER sync_auth_user_trigger
          AFTER INSERT OR UPDATE ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION sync_user_to_custom_table();
      `
      
      const { error } = await supabase.rpc('exec_sql', { sql: triggerSQL })
      
      if (error) {
        addLog(`❌ 创建触发器失败: ${error.message}`)
      } else {
        addLog('✅ 触发器创建成功！')
        await checkTrigger()
      }
    } catch (error) {
      addLog(`❌ 创建触发器异常: ${error}`)
    }
  }

  // 手动同步现有用户
  const syncExistingUsers = async () => {
    try {
      addLog('🔄 开始手动同步现有用户...')
      
      // 获取当前会话用户
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        addLog('❌ 没有当前登录用户，无法同步')
        return
      }
      
      addLog(`🔍 找到当前用户: ${user.email}`)
      
      // 检查用户是否已存在于自定义表中
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (existingUser) {
        addLog('✅ 用户已存在于自定义表中')
        return
      }
      
      // 手动插入用户
      const anonymousId = userService.getAnonymousId() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          google_id: user.id,
          anonymous_id: anonymousId,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          user_agent: navigator.userAgent,
          social_media_info: user.user_metadata || {},
          coins: 100,
          is_premium: false
        })
        .select()
        .single()
      
      if (insertError) {
        addLog(`❌ 手动同步失败: ${insertError.message}`)
      } else {
        addLog('✅ 手动同步成功！')
        
        // 更新userService状态
        await userService.handleAuthCallback(user)
        getCurrentUserStatus()
        await getCustomUsers()
      }
    } catch (error) {
      addLog(`❌ 手动同步异常: ${error}`)
    }
  }

  // 测试Google登录
  const testGoogleLogin = async () => {
    try {
      addLog('🔑 开始测试Google登录...')
      await userService.signInWithGoogle()
    } catch (error) {
      addLog(`❌ Google登录失败: ${error}`)
    }
  }

  useEffect(() => {
    addLog('🚀 用户同步测试页面加载完成')
    getCurrentUserStatus()
    checkTrigger()
    getCustomUsers()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">用户同步状态检查</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 控制面板 */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">操作面板</h2>
            <div className="space-y-2">
              <button
                onClick={getCurrentUserStatus}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                检查当前用户状态
              </button>
              <button
                onClick={checkTrigger}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                检查触发器状态
              </button>
              <button
                onClick={getCustomUsers}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                查看自定义用户表
              </button>
              <button
                onClick={createTrigger}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                创建/修复触发器
              </button>
              <button
                onClick={syncExistingUsers}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                手动同步当前用户
              </button>
              <button
                onClick={testGoogleLogin}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                测试Google登录
              </button>
            </div>
          </div>

          {/* 状态显示 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">系统状态</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>触发器状态:</span>
                <span className={triggerExists ? 'text-green-600' : 'text-red-600'}>
                  {triggerExists === null ? '检查中...' : (triggerExists ? '✅ 存在' : '❌ 不存在')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>当前用户:</span>
                <span className={currentUser ? 'text-green-600' : 'text-gray-600'}>
                  {currentUser ? currentUser.email : '未登录'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>自定义用户数:</span>
                <span>{customUsers.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 日志显示 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">操作日志</h2>
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

      {/* 用户数据显示 */}
      {customUsers.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">自定义用户表数据</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">邮箱</th>
                  <th className="text-left p-2">显示名</th>
                  <th className="text-left p-2">Google ID</th>
                  <th className="text-left p-2">匿名ID</th>
                  <th className="text-left p-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {customUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{user.id.substring(0, 8)}...</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.display_name}</td>
                    <td className="p-2 font-mono text-xs">{user.google_id?.substring(0, 8)}...</td>
                    <td className="p-2 font-mono text-xs">{user.anonymous_id?.substring(0, 12)}...</td>
                    <td className="p-2">{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}