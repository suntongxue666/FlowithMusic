'use client'

import { useState } from 'react'

export default function FixSunweiLettersPage() {
  const [result, setResult] = useState<string>('')

  const addTestLetters = () => {
    try {
      const testLetters = [
        {
          id: `sunwei-letter-${Date.now()}-1`,
          link_id: `sunwei-${Date.now()}-1`,
          user_id: 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981', // sunwei的user_id
          anonymous_id: null,
          recipient_name: 'Dear Friend',
          song_title: 'Shape of You',
          song_artist: 'Ed Sheeran',
          song_album_cover: 'https://i.scdn.co/image/ab67616d0000b2735755e164993798e0c9ef7d82',
          song_preview_url: 'https://p.scdn.co/mp3-preview/c454359d28a61e8c5c8b0b1d5c6e5c6e5c6e5c6e',
          song_spotify_url: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mkmht',
          message: 'This is a test letter to verify that sunwei7482@gmail.com can see letters in the history page. The music and message should display correctly.',
          view_count: 0,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: `sunwei-letter-${Date.now()}-2`,
          link_id: `sunwei-${Date.now()}-2`,
          user_id: 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981', // sunwei的user_id
          anonymous_id: null,
          recipient_name: 'My Love',
          song_title: 'Perfect',
          song_artist: 'Ed Sheeran',
          song_album_cover: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
          song_preview_url: 'https://p.scdn.co/mp3-preview/9a4b9b9b9b9b9b9b9b9b9b9b9b9b9b9b9b9b9b9b',
          song_spotify_url: 'https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v',
          message: 'Another test letter for sunwei user. This one was created yesterday to test the date sorting functionality.',
          view_count: 0,
          is_public: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
          updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      // 获取现有letters
      const existingLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      
      // 检查是否已经存在sunwei的letters
      const sunweiLetters = existingLetters.filter((l: any) => 
        l.user_id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981'
      )
      
      if (sunweiLetters.length > 0) {
        setResult(`已存在${sunweiLetters.length}个sunwei的letters，无需添加`)
        return
      }
      
      // 添加测试letters到开头
      const updatedLetters = [...testLetters, ...existingLetters]
      localStorage.setItem('letters', JSON.stringify(updatedLetters))
      
      // 清除可能的超时标记
      localStorage.removeItem('last_db_timeout')
      localStorage.removeItem('supabase_auth_error')
      
      setResult(`✅ 成功为sunwei用户添加了${testLetters.length}个测试letters！\\n现在访问History页面应该能看到letters了。`)
      
      console.log('✅ 已添加sunwei测试letters:', testLetters)
      
    } catch (error) {
      console.error('❌ 添加测试letters失败:', error)
      setResult(`❌ 添加失败: ${error}`)
    }
  }

  const clearAllLetters = () => {
    localStorage.removeItem('letters')
    localStorage.removeItem('last_db_timeout')
    localStorage.removeItem('supabase_auth_error')
    setResult('🧹 已清除所有letters数据')
  }

  const checkCurrentData = () => {
    const letters = JSON.parse(localStorage.getItem('letters') || '[]')
    const user = localStorage.getItem('user')
    const isAuth = localStorage.getItem('isAuthenticated')
    
    const info = {
      totalLetters: letters.length,
      sunweiLetters: letters.filter((l: any) => l.user_id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981').length,
      currentUser: user ? JSON.parse(user) : null,
      isAuthenticated: isAuth,
      allLetters: letters.map((l: any) => ({
        id: l.id,
        recipient: l.recipient_name,
        song: l.song_title,
        userId: l.user_id,
        created: l.created_at
      }))
    }
    
    setResult(JSON.stringify(info, null, 2))
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 修复Sunwei用户Letters</h1>
      <p>为sunwei7482@gmail.com用户添加测试letters，解决History页面空白问题</p>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={addTestLetters}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ➕ 添加Sunwei测试Letters
        </button>
        
        <button 
          onClick={checkCurrentData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔍 检查当前数据
        </button>
        
        <button 
          onClick={clearAllLetters}
          style={{
            padding: '12px 24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🧹 清除所有Letters
        </button>
      </div>
      
      {result && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginTop: '1rem'
        }}>
          <h3>📊 结果</h3>
          <pre style={{ 
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {result}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <h4>📋 使用说明</h4>
        <ol>
          <li><strong>添加测试Letters</strong>：为sunwei用户添加2个测试letters</li>
          <li><strong>检查当前数据</strong>：查看localStorage中的所有letters数据</li>
          <li><strong>清除所有Letters</strong>：清空所有letters数据</li>
        </ol>
        <p><strong>注意</strong>：添加测试letters后，访问History页面应该能看到2个letters</p>
      </div>
    </div>
  )
}