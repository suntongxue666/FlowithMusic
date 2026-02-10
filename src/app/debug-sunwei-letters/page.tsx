'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { userService } from '@/lib/userService'
import { letterService } from '@/lib/letterService'

export default function DebugSunweiLettersPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkSunweiData = async () => {
    setLoading(true)
    const debugResults: any = {
      timestamp: new Date().toISOString(),
      checks: {}
    }

    try {
      // 1. 检查数据库中是否有sunwei7482@gmail.com用户
      console.log('🔍 检查sunwei7482@gmail.com用户...')

      if (supabase) {
        try {
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'sunwei7482@gmail.com')

          debugResults.checks.userInDatabase = {
            success: !userError,
            error: userError?.message,
            users: users || [],
            userCount: users?.length || 0
          }

          if (users && users.length > 0) {
            const user = users[0]
            console.log('✅ 找到用户:', user)

            // 2. 检查该用户的letters
            const { data: letters, error: lettersError } = await supabase
              .from('letters')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })

            debugResults.checks.lettersInDatabase = {
              success: !lettersError,
              error: lettersError?.message,
              letters: letters || [],
              letterCount: letters?.length || 0,
              letterDetails: letters?.map(l => ({
                id: l.id,
                link_id: l.link_id,
                recipient_name: l.recipient_name,
                song_title: l.song_title,
                created_at: l.created_at,
                user_id: l.user_id,
                anonymous_id: l.anonymous_id
              })) || []
            }

            // 3. 检查是否有匿名letters需要迁移
            if (user.anonymous_id) {
              const { data: anonymousLetters, error: anonError } = await supabase
                .from('letters')
                .select('*')
                .eq('anonymous_id', user.anonymous_id)
                .is('user_id', null)

              debugResults.checks.anonymousLettersToMigrate = {
                success: !anonError,
                error: anonError?.message,
                letters: anonymousLetters || [],
                letterCount: anonymousLetters?.length || 0
              }
            }

            // 4. 检查所有相关的letters（包括anonymous_id匹配的）
            const { data: allRelatedLetters, error: allError } = await supabase
              .from('letters')
              .select('*')
              .or(`user_id.eq.${user.id},anonymous_id.eq.${user.anonymous_id || 'none'}`)
              .order('created_at', { ascending: false })

            debugResults.checks.allRelatedLetters = {
              success: !allError,
              error: allError?.message,
              letters: allRelatedLetters || [],
              letterCount: allRelatedLetters?.length || 0,
              letterDetails: allRelatedLetters?.map(l => ({
                id: l.id,
                link_id: l.link_id,
                recipient_name: l.recipient_name,
                song_title: l.song_title,
                created_at: l.created_at,
                user_id: l.user_id,
                anonymous_id: l.anonymous_id,
                matchType: l.user_id === user.id ? 'user_id' : 'anonymous_id'
              })) || []
            }
          }
        } catch (dbError) {
          debugResults.checks.databaseError = {
            success: false,
            error: dbError
          }
        }
      } else {
        debugResults.checks.supabaseNotAvailable = true
      }

      // 5. 检查当前用户状态
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      const anonymousId = userService.getAnonymousId()

      debugResults.checks.currentUserState = {
        user: currentUser,
        isAuthenticated: isAuth,
        anonymousId: anonymousId,
        isSunwei: currentUser?.email === 'sunwei7482@gmail.com'
      }

      // 6. 检查localStorage中的数据
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      const localUser = localStorage.getItem('user')

      debugResults.checks.localStorage = {
        user: localUser ? JSON.parse(localUser) : null,
        letters: localLetters,
        letterCount: localLetters.length,
        sunweiLetters: localLetters.filter((l: any) =>
          l.user_id === currentUser?.id ||
          (currentUser?.anonymous_id && l.anonymous_id === currentUser.anonymous_id)
        )
      }

      // 7. 如果当前用户是sunwei，尝试调用letterService.getUserLetters
      if (currentUser?.email === 'sunwei7482@gmail.com') {
        try {
          const serviceLetters = await letterService.getUserLetters(currentUser.id)
          debugResults.checks.letterServiceResult = {
            success: true,
            letters: serviceLetters,
            letterCount: serviceLetters.length,
            letterDetails: serviceLetters.map(l => ({
              id: l.id,
              link_id: l.link_id,
              recipient_name: l.recipient_name,
              song_title: l.song_title,
              created_at: l.created_at,
              user_id: l.user_id,
              anonymous_id: l.anonymous_id
            }))
          }
        } catch (serviceError) {
          debugResults.checks.letterServiceResult = {
            success: false,
            error: serviceError
          }
        }
      }

    } catch (error) {
      debugResults.checks.generalError = {
        success: false,
        error: error
      }
    }

    setResults(debugResults)
    setLoading(false)
  }

  const migrateSunweiLetters = async () => {
    if (!results?.checks?.userInDatabase?.users?.[0]) {
      alert('请先检查数据，确认用户存在')
      return
    }

    setLoading(true)
    try {
      const user = results.checks.userInDatabase.users[0]
      console.log('🔄 开始迁移sunwei用户的letters...')

      if (supabase && user.anonymous_id) {
        // 迁移匿名letters到用户
        const { data, error } = await supabase
          .rpc('migrate_anonymous_letters_to_user', {
            p_user_id: user.id,
            p_anonymous_id: user.anonymous_id
          })

        if (error) {
          console.error('❌ 迁移失败:', error)
          alert(`迁移失败: ${error.message}`)
        } else {
          console.log('✅ 迁移成功，迁移了', data, '个letters')
          alert(`迁移成功！迁移了 ${data || 0} 个letters`)

          // 重新检查数据
          await checkSunweiData()
        }
      }
    } catch (error) {
      console.error('💥 迁移异常:', error)
      alert(`迁移异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 页面加载时自动检查
    checkSunweiData()
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Sunwei Letters 调试页面</h1>
      <p>检查 sunwei7482@gmail.com 用户的letter数据</p>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={checkSunweiData}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? '检查中...' : '🔍 检查数据'}
        </button>

        <button
          onClick={migrateSunweiLetters}
          disabled={loading || !results?.checks?.userInDatabase?.users?.[0]}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '迁移中...' : '🔄 迁移Letters'}
        </button>
      </div>

      {results && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h2>📊 检查结果</h2>
          <pre style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '600px'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      {results?.checks?.userInDatabase?.users?.[0] && (
        <div style={{ marginTop: '2rem' }}>
          <h3>📋 快速摘要</h3>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p><strong>用户ID:</strong> {results.checks.userInDatabase.users[0].id}</p>
            <p><strong>邮箱:</strong> {results.checks.userInDatabase.users[0].email}</p>
            <p><strong>匿名ID:</strong> {results.checks.userInDatabase.users[0].anonymous_id}</p>
            <p><strong>数据库中的Letters:</strong> {results.checks.lettersInDatabase?.letterCount || 0}</p>
            <p><strong>需要迁移的匿名Letters:</strong> {results.checks.anonymousLettersToMigrate?.letterCount || 0}</p>
            <p><strong>所有相关Letters:</strong> {results.checks.allRelatedLetters?.letterCount || 0}</p>
            <p><strong>letterService返回的Letters:</strong> {results.checks.letterServiceResult?.letterCount || 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}