'use client'

import { useState } from 'react'
import { letterService } from '@/lib/letterService'

export default function TestDatabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testCreateLetter = async () => {
    setLoading(true)
    setResult('Testing letter creation...\n')
    
    try {
      // 创建测试Letter
      const testLetter = await letterService.createLetter({
        to: 'Database Test User',
        message: 'This is a comprehensive test message to verify that our database integration is working correctly with more than twelve words as required for homepage display.',
        song: {
          id: 'test_song_12345',
          title: 'Test Database Song',
          artist: 'Test Database Artist',
          albumCover: 'https://via.placeholder.com/300x300/1DB954/ffffff?text=Test+Album',
          spotifyUrl: 'https://open.spotify.com/track/test_database_song'
        }
      })
      
      setResult(prev => prev + `✅ Letter created successfully!\n`)
      setResult(prev => prev + `📝 Link ID: ${testLetter.link_id}\n`)
      setResult(prev => prev + `📄 Shareable Link: ${testLetter.shareable_link || 'N/A'}\n`)
      setResult(prev => prev + `🗄️ Storage: ${testLetter.id.includes('test_') ? 'Fallback Storage' : 'Supabase'}\n\n`)
      
      // 测试首页数据获取
      setResult(prev => prev + 'Testing homepage data retrieval...\n')
      
      const publicLetters = await letterService.getPublicLetters(10, 0, 'created_at')
      setResult(prev => prev + `📊 Found ${publicLetters.length} public letters\n`)
      
      // 检查新创建的Letter是否在结果中
      const foundNewLetter = publicLetters.find(l => l.link_id === testLetter.link_id)
      if (foundNewLetter) {
        setResult(prev => prev + `✅ New letter found in homepage data!\n`)
      } else {
        setResult(prev => prev + `⚠️ New letter not found in homepage data\n`)
      }
      
      // 显示符合条件的Letters（12个单词以上）
      const validLetters = publicLetters.filter(letter => {
        const wordCount = letter.message.trim().split(/\s+/).length
        return wordCount >= 12
      })
      
      setResult(prev => prev + `📋 ${validLetters.length} letters meet 12+ word criteria\n`)
      
      if (validLetters.length > 0) {
        setResult(prev => prev + `\nRecent valid letters:\n`)
        validLetters.slice(0, 3).forEach((letter, i) => {
          const wordCount = letter.message.trim().split(/\s+/).length
          setResult(prev => prev + `${i+1}. To: ${letter.recipient_name} (${wordCount} words)\n`)
          setResult(prev => prev + `   Song: ${letter.song_title} by ${letter.song_artist}\n`)
          setResult(prev => prev + `   Created: ${new Date(letter.created_at).toLocaleString()}\n`)
        })
      }
      
    } catch (error) {
      console.error('Test failed:', error)
      setResult(prev => prev + `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  const testHomepageData = async () => {
    setLoading(true)
    setResult('Testing homepage data only...\n')
    
    try {
      const publicLetters = await letterService.getPublicLetters(20, 0, 'created_at')
      setResult(prev => prev + `📊 Total public letters: ${publicLetters.length}\n`)
      
      // 分析数据源
      const supabaseLetters = publicLetters.filter(l => !l.id.includes('test_') && !l.id.startsWith('2025'))
      const fallbackLetters = publicLetters.filter(l => l.id.includes('test_') || l.id.startsWith('2025'))
      
      setResult(prev => prev + `🗄️ From Supabase: ${supabaseLetters.length}\n`)
      setResult(prev => prev + `📦 From Fallback: ${fallbackLetters.length}\n`)
      
      // 应用首页过滤条件
      const validLetters = publicLetters.filter(letter => {
        const wordCount = letter.message.trim().split(/\s+/).length
        return wordCount >= 12
      })
      
      setResult(prev => prev + `✅ Valid for homepage (12+ words): ${validLetters.length}\n\n`)
      
      if (validLetters.length > 0) {
        setResult(prev => prev + `Homepage letters preview:\n`)
        validLetters.slice(0, 6).forEach((letter, i) => {
          const wordCount = letter.message.trim().split(/\s+/).length
          setResult(prev => prev + `${i+1}. "${letter.recipient_name}" - ${letter.song_title} (${wordCount} words)\n`)
        })
      } else {
        setResult(prev => prev + `⚠️ No letters meet homepage criteria\n`)
      }
      
    } catch (error) {
      console.error('Homepage test failed:', error)
      setResult(prev => prev + `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    }
    
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Database Integration Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={testCreateLetter}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? 'Testing...' : 'Test Create Letter + Homepage'}
        </button>
        
        <button 
          onClick={testHomepageData}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Test Homepage Data Only'}
        </button>
      </div>
      
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        borderRadius: '0.5rem',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        minHeight: '200px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {result || 'Click a button to run tests...'}
      </div>
    </div>
  )
}