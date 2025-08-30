'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugUserLettersPage() {
  const [userData, setUserData] = useState<any>(null)
  const [lettersData, setLettersData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserAndLetters = async () => {
      try {
        console.log('🔍 开始查询用户和Letters数据...')
        
        // 1. 查找用户
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'sunwei7482@gmail.com')
        
        if (userError) {
          throw new Error(`用户查询失败: ${userError.message}`)
        }
        
        console.log('👤 用户查询结果:', users)
        
        if (!users || users.length === 0) {
          setError('未找到用户 sunwei7482@gmail.com')
          return
        }
        
        const user = users[0]
        setUserData(user)
        
        // 2. 查找该用户的所有Letters
        const { data: letters, error: lettersError } = await supabase
          .from('letters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (lettersError) {
          throw new Error(`Letters查询失败: ${lettersError.message}`)
        }
        
        console.log('📝 Letters查询结果:', letters)
        setLettersData(letters || [])
        
        // 3. 也查询可能的匿名Letters
        if (user.anonymous_id) {
          const { data: anonymousLetters, error: anonError } = await supabase
            .from('letters')
            .select('*')
            .eq('anonymous_id', user.anonymous_id)
            .is('user_id', null)
            .order('created_at', { ascending: false })
          
          if (!anonError && anonymousLetters && anonymousLetters.length > 0) {
            console.log('📝 匿名Letters查询结果:', anonymousLetters)
            setLettersData(prev => [...prev, ...anonymousLetters])
          }
        }
        
      } catch (err: any) {
        console.error('❌ 查询失败:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndLetters()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>查询用户Letters数据</h1>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>查询用户Letters数据</h1>
        <p style={{ color: 'red' }}>错误: {error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>用户Letters数据查询结果</h1>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>👤 用户信息</h2>
        <p><strong>邮箱:</strong> {userData?.email}</p>
        <p><strong>用户ID:</strong> {userData?.id}</p>
        <p><strong>显示名:</strong> {userData?.display_name}</p>
        <p><strong>匿名ID:</strong> {userData?.anonymous_id}</p>
        <p><strong>创建时间:</strong> {userData?.created_at}</p>
        <p><strong>积分:</strong> {userData?.coins}</p>
        <p><strong>是否高级用户:</strong> {userData?.is_premium ? '是' : '否'}</p>
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>📝 Letters统计</h2>
        <p><strong>总Letters数量:</strong> {lettersData.length}</p>
        <p><strong>昨天创建的Letters:</strong> {
          lettersData.filter(letter => {
            const letterDate = new Date(letter.created_at)
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            return letterDate.toDateString() === yesterday.toDateString()
          }).length
        }</p>
        <p><strong>今天创建的Letters:</strong> {
          lettersData.filter(letter => {
            const letterDate = new Date(letter.created_at)
            const today = new Date()
            return letterDate.toDateString() === today.toDateString()
          }).length
        }</p>
      </div>

      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>📋 Letters详细列表</h2>
        {lettersData.length === 0 ? (
          <p>没有找到任何Letters</p>
        ) : (
          <div>
            {lettersData.map((letter, index) => (
              <div key={letter.id || index} style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                border: '1px solid #eee', 
                borderRadius: '3px',
                backgroundColor: '#f9f9f9'
              }}>
                <p><strong>Letter ID:</strong> {letter.id}</p>
                <p><strong>Link ID:</strong> {letter.link_id}</p>
                <p><strong>标题:</strong> {letter.title || '无标题'}</p>
                <p><strong>内容预览:</strong> {letter.content ? letter.content.substring(0, 100) + '...' : '无内容'}</p>
                <p><strong>创建时间:</strong> {new Date(letter.created_at).toLocaleString()}</p>
                <p><strong>查看次数:</strong> {letter.view_count || 0}</p>
                <p><strong>用户ID:</strong> {letter.user_id || '匿名'}</p>
                <p><strong>匿名ID:</strong> {letter.anonymous_id || '无'}</p>
                <p><strong>歌曲:</strong> {letter.song_name || '无'} - {letter.artist_name || '无'}</p>
                <p><strong>链接:</strong> <a href={`/letter/${letter.link_id}`} target="_blank">/letter/{letter.link_id}</a></p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>🔍 原始数据 (JSON)</h2>
        <details>
          <summary>点击查看用户原始数据</summary>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(userData, null, 2)}
          </pre>
        </details>
        <details>
          <summary>点击查看Letters原始数据</summary>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(lettersData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}