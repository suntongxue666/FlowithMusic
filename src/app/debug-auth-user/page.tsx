'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuthUserPage() {
  const [authUser, setAuthUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查当前会话
        const { data: { session }, error: sessionError } = await supabase!.auth.getSession()
        console.log('会话检查结果:', { session, sessionError })
        setSession(session)

        if (session && session.user) {
          const user = session.user
          console.log('=== Supabase Auth User Object Debug ===')
          console.log('完整用户对象:', user)
          console.log('用户类型:', typeof user)
          console.log('用户构造函数:', user.constructor.name)
          console.log('所有字段:', Object.keys(user))
          console.log('字段类型和值:')
          Object.keys(user).forEach(key => {
            console.log(`  ${key}: ${typeof (user as any)[key]} = ${(user as any)[key]}`)
          })
          
          const userAny = user as any
          setAuthUser({
            // 基本信息
            id: userAny.id,
            email: userAny.email,
            phone: userAny.phone,
            
            // 元数据
            user_metadata: userAny.user_metadata,
            app_metadata: userAny.app_metadata,
            
            // 认证信息
            aud: userAny.aud,
            sub: userAny.sub,
            
            // 时间戳
            created_at: userAny.created_at,
            updated_at: userAny.updated_at,
            last_sign_in_at: userAny.last_sign_in_at,
            
            // 其他可能的字段
            role: userAny.role,
            email_confirmed_at: userAny.email_confirmed_at,
            phone_confirmed_at: userAny.phone_confirmed_at,
            
            // 原始对象的所有字段
            allFields: Object.keys(user),
            
            // 检查常见ID字段
            possibleIds: {
              id: userAny.id,
              sub: userAny.sub,
              aud: userAny.aud,
              email: userAny.email
            }
          })
        }

      } catch (error) {
        console.error('认证检查错误:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const tryLogin = async () => {
    try {
      setLoading(true)
      await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/debug-auth-user`
        }
      })
    } catch (error) {
      console.error('登录错误:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>检查认证状态...</div>
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Supabase Auth 用户对象调试</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>会话状态:</h3>
        {session ? (
          <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '4px' }}>
            <p>✅ 已登录</p>
            <p><strong>Access Token:</strong> {session.access_token ? '存在' : '不存在'}</p>
            <p><strong>Refresh Token:</strong> {session.refresh_token ? '存在' : '不存在'}</p>
            <p><strong>Token 过期时间:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
          </div>
        ) : (
          <div style={{ background: '#ffeaa7', padding: '1rem', borderRadius: '4px' }}>
            <p>⚠️ 未登录</p>
            <button 
              onClick={tryLogin}
              style={{
                padding: '10px 20px',
                background: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Google 登录
            </button>
          </div>
        )}
      </div>

      {authUser && (
        <div>
          <h3>用户对象分析:</h3>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <h4>🔍 ID 字段检查:</h4>
            <div style={{ marginLeft: '1rem' }}>
              <p><strong>user.id:</strong> <code>{JSON.stringify(authUser.possibleIds.id)}</code> (类型: {typeof authUser.possibleIds.id})</p>
              <p><strong>user.sub:</strong> <code>{JSON.stringify(authUser.possibleIds.sub)}</code> (类型: {typeof authUser.possibleIds.sub})</p>
              <p><strong>user.aud:</strong> <code>{JSON.stringify(authUser.possibleIds.aud)}</code> (类型: {typeof authUser.possibleIds.aud})</p>
              <p><strong>user.email:</strong> <code>{JSON.stringify(authUser.possibleIds.email)}</code> (类型: {typeof authUser.possibleIds.email})</p>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <h4>📋 所有字段列表:</h4>
            <p>{authUser.allFields.join(', ')}</p>
          </div>

          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
            <h4>📄 完整用户对象:</h4>
            <pre style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '4px', 
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(authUser, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}