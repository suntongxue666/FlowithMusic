'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'

export default function DevTestPanel() {
  const { user, isAuthenticated, signInWithGoogle } = useUser()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-supabase')
      const result = await response.json()
      setTestResult(result)
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
      setTimeout(() => {
        testDatabase()
      }, 3000)
    } catch (error) {
      setTestResult({ 
        error: 'Google登录失败', 
        details: error instanceof Error ? error.message : String(error) 
      })
      setLoading(false)
    }
  }

  // 只在开发环境显示
  if (process.env.NODE_ENV === 'production' && !showPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowPanel(true)}
          className="bg-gray-800 text-white px-3 py-1 rounded text-xs"
        >
          🧪 Test
        </button>
      </div>
    )
  }

  if (!showPanel && process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🧪 数据库测试面板 v2.0</h2>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex gap-4 justify-center">
              {!isAuthenticated ? (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? '登录中...' : '🔐 Google登录'}
                </button>
              ) : (
                <div className="text-green-600 font-medium">
                  ✅ 已登录：{user?.email}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={testDatabase}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '测试中...' : '🔍 测试数据库'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">测试结果：</h3>
              <pre className="text-sm overflow-auto max-h-96 bg-white p-4 rounded border">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">🎯 测试内容:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>检查users表记录</li>
                  <li>检查letter_interactions表</li>
                  <li>验证Google OAuth登录</li>
                  <li>测试触发器是否工作</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📊 当前状态:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>认证状态: {isAuthenticated ? '✅ 已登录' : '❌ 未登录'}</li>
                  <li>用户邮箱: {user?.email || '无'}</li>
                  <li>Supabase: {testResult?.success ? '✅ 连接正常' : '⚠️ 待测试'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}