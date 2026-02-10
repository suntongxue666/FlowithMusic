'use client'

import { useState, useEffect } from 'react'
import { letterService } from '@/lib/letterService'
import { useUser } from '@/contexts/UserContext'
import { Letter } from '@/lib/supabase'

export default function TestHistoryPage() {
  const { user, anonymousId, isAuthenticated } = useUser()
  const [letters, setLetters] = useState<Letter[]>([])
  const [localLetters, setLocalLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})

  const testGetUserLetters = async () => {
    setLoading(true)
    try {
      console.log('🔍 Testing getUserLetters with:', {
        user: user?.id,
        anonymousId,
        isAuthenticated
      })

      const result = user ? await letterService.getUserLetters(user.id) : []
      console.log('📋 getUserLetters result:', result)
      setLetters(result)

      // 也检查本地存储
      const localData = JSON.parse(localStorage.getItem('letters') || '[]')
      console.log('💾 localStorage letters:', localData)
      setLocalLetters(localData)

      setDebugInfo({
        user: user?.id || 'not authenticated',
        anonymousId: anonymousId || 'no anonymous id',
        isAuthenticated,
        remoteCount: result.length,
        localCount: localData.length,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ Error testing getUserLetters:', error)
    } finally {
      setLoading(false)
    }
  }

  const testCreateLetter = async () => {
    setLoading(true)
    try {
      console.log('✍️ Testing create letter')

      const testLetter = {
        to: 'Test Recipient',
        message: 'This is a test message from the test page',
        song: {
          id: 'test-song-id',
          title: 'Test Song',
          artist: 'Test Artist',
          albumCover: 'https://via.placeholder.com/300',
          spotifyUrl: 'https://open.spotify.com/track/test',
          duration_ms: 180000
        }
      }

      const result = await letterService.createLetter(testLetter)
      console.log('✅ Created test letter:', result)

      // 重新获取letters
      await testGetUserLetters()
    } catch (error) {
      console.error('❌ Error creating test letter:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testGetUserLetters()
  }, [user, anonymousId, isAuthenticated])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>History Debug Page</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Debug Info</h3>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button onClick={testGetUserLetters} disabled={loading}>
          {loading ? 'Loading...' : 'Test getUserLetters'}
        </button>
        <button onClick={testCreateLetter} disabled={loading} style={{ marginLeft: '1rem' }}>
          {loading ? 'Loading...' : 'Create Test Letter'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <h3>Remote Letters ({letters.length})</h3>
          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ccc', padding: '1rem' }}>
            {letters.length === 0 ? (
              <p>No remote letters found</p>
            ) : (
              letters.map((letter, index) => (
                <div key={letter.id || index} style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e9e9e9' }}>
                  <div><strong>To:</strong> {letter.recipient_name}</div>
                  <div><strong>Song:</strong> {letter.song_title} - {letter.song_artist}</div>
                  <div><strong>User ID:</strong> {letter.user_id || 'null'}</div>
                  <div><strong>Anonymous ID:</strong> {letter.anonymous_id || 'null'}</div>
                  <div><strong>Link ID:</strong> {letter.link_id}</div>
                  <div><strong>Created:</strong> {letter.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Local Letters ({localLetters.length})</h3>
          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ccc', padding: '1rem' }}>
            {localLetters.length === 0 ? (
              <p>No local letters found</p>
            ) : (
              localLetters.map((letter, index) => (
                <div key={letter.id || index} style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffe9e9' }}>
                  <div><strong>To:</strong> {letter.recipient_name}</div>
                  <div><strong>Song:</strong> {letter.song_title} - {letter.song_artist}</div>
                  <div><strong>User ID:</strong> {letter.user_id || 'null'}</div>
                  <div><strong>Anonymous ID:</strong> {letter.anonymous_id || 'null'}</div>
                  <div><strong>Link ID:</strong> {letter.link_id}</div>
                  <div><strong>Created:</strong> {letter.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}