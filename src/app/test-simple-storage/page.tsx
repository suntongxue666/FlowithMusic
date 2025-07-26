'use client'

import { useState } from 'react'

export default function TestSimpleStoragePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [testLinkId, setTestLinkId] = useState('test-' + Date.now())

  const testSave = async () => {
    setLoading(true)
    setResult('Testing save...')
    
    try {
      const testLetter = {
        id: testLinkId,
        link_id: testLinkId,
        recipient_name: 'Test Recipient',
        message: 'This is a test message',
        song_id: 'test-song',
        song_title: 'Test Song',
        song_artist: 'Test Artist',
        song_album_cover: 'https://via.placeholder.com/300',
        song_spotify_url: 'https://open.spotify.com/track/test',
        anonymous_id: 'test-anon-id',
        view_count: 0,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const response = await fetch(`/api/simple-storage/${testLinkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLetter)
      })

      if (response.ok) {
        const savedLetter = await response.json()
        setResult(`✅ Save successful!
Link ID: ${savedLetter.link_id}
Recipient: ${savedLetter.recipient_name}
Message: ${savedLetter.message}`)
      } else {
        const errorText = await response.text()
        setResult(`❌ Save failed: ${response.status} ${response.statusText}
Error: ${errorText}`)
      }
    } catch (error) {
      setResult(`❌ Save error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLoad = async () => {
    setLoading(true)
    setResult('Testing load...')
    
    try {
      const response = await fetch(`/api/simple-storage/${testLinkId}`)

      if (response.ok) {
        const letter = await response.json()
        setResult(`✅ Load successful!
Link ID: ${letter.link_id}
Recipient: ${letter.recipient_name}
Message: ${letter.message}
Created: ${letter.created_at}`)
      } else if (response.status === 404) {
        setResult(`❌ Letter not found: ${testLinkId}
This might mean the save didn't work or the server restarted.`)
      } else {
        const errorText = await response.text()
        setResult(`❌ Load failed: ${response.status} ${response.statusText}
Error: ${errorText}`)
      }
    } catch (error) {
      setResult(`❌ Load error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLetterPage = () => {
    window.open(`/letter/${testLinkId}`, '_blank')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Simple Storage Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label>Test Link ID: </label>
        <input 
          type="text" 
          value={testLinkId} 
          onChange={(e) => setTestLinkId(e.target.value)}
          style={{ 
            padding: '0.5rem', 
            marginLeft: '0.5rem', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            width: '200px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={testSave}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : '1. Test Save'}
        </button>
        
        <button 
          onClick={testLoad}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : '2. Test Load'}
        </button>
        
        <button 
          onClick={testLetterPage}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#17a2b8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          3. Test Letter Page
        </button>
        
        <button 
          onClick={() => window.location.href = '/'}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '1rem', 
        borderRadius: '8px', 
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        minHeight: '200px'
      }}>
        {result || 'Click "1. Test Save" first, then "2. Test Load", then "3. Test Letter Page"'}
      </div>
      
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p><strong>Test Steps:</strong></p>
        <p>1. Click "Test Save" to save a test letter</p>
        <p>2. Click "Test Load" to verify it was saved</p>
        <p>3. Click "Test Letter Page" to see if the letter page can load it</p>
      </div>
    </div>
  )
}