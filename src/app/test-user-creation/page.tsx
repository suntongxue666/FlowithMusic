'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { supabase } from '@/lib/supabase'

export default function TestUserCreation() {
  const { user, isAuthenticated, signInWithGoogle } = useUser()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkUserInDatabase = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        setTestResult({ error: 'Supabase客户端未初始化' })
        return
      }

      // 检查自建users表中的用户
      const { data: customUsers, error: customError } = await supabase
        .from('users')
        .select('*')
        .limit(10)

      // 检查auth.users中的用户
      const { data: authData, error: authError } = await supabase.auth.getUser()

      setTestResult({
        自建users表: {
          数据: customUsers,
          错误: customError,
          用户数量: customUsers?.length || 0
        },
        认证状态: {
          当前认证用户: authData?.user,
          本地用户状态: user,
          是否认证: isAuthenticated,
          错误: authError
        },
        测试时间: new Date().toLocaleString()
      })

    } catch (error) {
      setTestResult({ 
        error: '测试失败', 
        details: error instanceof Error ? error.message : String(error) 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // 等待几秒让触发器工作
      setTimeout(() => {
        checkUserInDatabase()
        setLoading(false)
      }, 3000)
    } catch (error) {
      setTestResult({ 
        error: 'Google登录失败', 
        details: error instanceof Error ? error.message : String(error) 
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🧪 用户记录创建测试
          </h1>

          <div className="space-y-4 mb-6">
            <div className="flex gap-4 justify-center">
              {!isAuthenticated ? (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? '登录中...' : '🔐 Google登录测试'}
                </button>
              ) : (
                <div className="text-green-600 font-medium">
                  ✅ 已登录用户：{user?.email}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={checkUserInDatabase}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '检查中...' : '🔍 检查用户数据'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">测试结果：</h2>
              <pre className="text-sm overflow-auto max-h-96 bg-white p-4 rounded border">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">📋 测试步骤：</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>首先在Supabase后台执行触发器脚本（create-user-sync-trigger.sql）</li>
              <li>点击"Google登录测试"进行OAuth登录</li>
              <li>登录成功后自动检查数据库中的用户记录</li>
              <li>观察自建users表是否成功创建了用户记录</li>
              <li>验证用户信息是否正确同步（邮箱、头像、显示名等）</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold mb-2">🎯 预期结果：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Google登录成功后，auth.users表自动创建用户</li>
              <li>触发器自动在自建users表中创建对应记录</li>
              <li>用户信息完整同步（邮箱、头像、display_name等）</li>
              <li>自动分配anonymous_id和默认设置（100金币等）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}