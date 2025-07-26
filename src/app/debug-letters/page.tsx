'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { letterService } from '@/lib/letterService'

export default function DebugLettersPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        // 检查环境变量
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        // 动态导入supabase
        const { supabase } = await import('@/lib/supabase')
        
        // 获取用户信息
        const anonymousId = await userService.initializeUser()
        const currentUser = userService.getCurrentUser()
        
        // 获取localStorage数据
        const localStorageLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        
        // 获取用户letters
        const userLetters = await letterService.getUserLetters(50, 0)
        
        // 测试Supabase连接
        let supabaseTest = null
        if (supabase) {
          try {
            const { data, error } = await supabase.from('letters').select('count').limit(1)
            supabaseTest = { success: !error, error: error?.message, data }
          } catch (err) {
            supabaseTest = { success: false, error: String(err) }
          }
        }
        
        setDebugInfo({
          environment: {
            supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set',
            supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not set',
            supabaseClient: !!supabase
          },
          supabaseTest,
          anonymousId,
          currentUser,
          localStorageLetters,
          userLetters,
          localStorageKeys: Object.keys(localStorage),
          userAgent: localStorage.getItem('user_agent')
        })
      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: String(error) })
      }
    }
    
    loadDebugInfo()
  }, [])

  const clearLocalStorage = () => {
    localStorage.clear()
    window.location.reload()
  }

  const createTestLetter = async () => {
    try {
      console.log('Creating test letter...')
      const letter = await letterService.createLetter({
        to: 'Debug Test',
        message: 'This is a debug test message',
        song: {
          id: 'debug-song-id',
          title: 'Debug Song',
          artist: 'Debug Artist',
          albumCover: 'https://via.placeholder.com/300',
          spotifyUrl: 'https://open.spotify.com/track/debug'
        }
      })
      
      console.log('Test letter created:', letter)
      alert(`Test letter created with link_id: ${letter.link_id}`)
      window.location.reload()
    } catch (error) {
      console.error('Failed to create test letter:', error)
      alert(`Failed to create test letter: ${error}`)
    }
  }

  const testSupabaseConnection = async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      if (!supabase) {
        alert('Supabase client is not available')
        return
      }
      
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      
      // 测试简单的查询
      const { data, error } = await supabase.from('letters').select('count').limit(1)
      
      if (error) {
        console.error('Supabase error details:', error)
        alert(`Supabase error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`)
      } else {
        alert(`Supabase connection successful! Query returned: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.error('Connection test error:', error)
      alert(`Supabase test failed: ${error}\nType: ${typeof error}\nMessage: ${error.message || 'Unknown error'}`)
    }
  }

  const testDirectFetch = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/letters?select=count&limit=1`
      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      alert(`Direct fetch successful: ${JSON.stringify(data)}`)
    } catch (error) {
      alert(`Direct fetch failed: ${error}`)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>Debug Letters Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={createTestLetter}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Create Test Letter
        </button>
        
        <button 
          onClick={clearLocalStorage}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Clear LocalStorage
        </button>
        
        <button 
          onClick={testSupabaseConnection}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#6f42c1', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Test Supabase
        </button>
        
        <button 
          onClick={testDirectFetch}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#fd7e14', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Test Direct Fetch
        </button>
        
        <button 
          onClick={() => window.location.href = '/history'}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Go to History
        </button>
      </div>

      <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h3>Debug Information:</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  )
}