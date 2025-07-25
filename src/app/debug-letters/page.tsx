'use client'

import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { letterService } from '@/lib/letterService'

export default function DebugLettersPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        // 获取用户信息
        const anonymousId = await userService.initializeUser()
        const currentUser = userService.getCurrentUser()
        
        // 获取localStorage数据
        const localStorageLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        
        // 获取用户letters
        const userLetters = await letterService.getUserLetters(50, 0)
        
        setDebugInfo({
          anonymousId,
          currentUser,
          localStorageLetters,
          userLetters,
          localStorageKeys: Object.keys(localStorage),
          userAgent: localStorage.getItem('user_agent')
        })
      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: error.toString() })
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
      window.location.reload()
    } catch (error) {
      console.error('Failed to create test letter:', error)
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