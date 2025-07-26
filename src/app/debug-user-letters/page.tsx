'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { userService } from '@/lib/userService'
import { letterService } from '@/lib/letterService'
import { supabase } from '@/lib/supabase'

export default function DebugUserLettersPage() {
  const { user, anonymousId, isAuthenticated } = useUser()
  const [debugData, setDebugData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const debugUserLetters = async () => {
    setLoading(true)
    const debug: any = {
      timestamp: new Date().toISOString(),
      userContext: {},
      localStorage: {},
      userServiceData: {},
      letterServiceData: {},
      supabaseData: {}
    }

    try {
      // 1. User Context 数据
      debug.userContext = {
        user: user ? {
          id: user.id,
          email: user.email,
          anonymous_id: user.anonymous_id,
          display_name: user.display_name
        } : null,
        anonymousId,
        isAuthenticated
      }

      // 2. localStorage 数据
      if (typeof window !== 'undefined') {
        debug.localStorage = {
          anonymous_id: localStorage.getItem('anonymous_id'),
          letters: JSON.parse(localStorage.getItem('letters') || '[]'),
          user_agent: localStorage.getItem('user_agent')
        }
      }

      // 3. UserService 数据
      debug.userServiceData = {
        getCurrentUser: userService.getCurrentUser(),
        getAnonymousId: userService.getAnonymousId(),
        isAuthenticated: userService.isAuthenticated()
      }

      // 4. LetterService getUserLetters 调用
      console.log('📞 Calling letterService.getUserLetters...')
      const userLetters = await letterService.getUserLetters(50, 0)
      debug.letterServiceData = {
        userLettersCount: userLetters.length,
        userLetters: userLetters.map(letter => ({
          id: letter.id,
          link_id: letter.link_id,
          recipient_name: letter.recipient_name,
          song_title: letter.song_title,
          user_id: letter.user_id,
          anonymous_id: letter.anonymous_id,
          created_at: letter.created_at
        }))
      }

      // 5. 直接查询 Supabase
      if (supabase) {
        console.log('📞 Querying Supabase directly...')
        
        // 查询所有letters
        const { data: allLetters } = await supabase
          .from('letters')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        debug.supabaseData.allLetters = allLetters?.map(letter => ({
          id: letter.id,
          link_id: letter.link_id,
          recipient_name: letter.recipient_name,
          song_title: letter.song_title,
          user_id: letter.user_id,
          anonymous_id: letter.anonymous_id,
          created_at: letter.created_at
        })) || []

        // 如果用户已登录，查询用户的letters
        if (user) {
          const { data: userLettersFromDB } = await supabase
            .from('letters')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          debug.supabaseData.userLettersFromDB = userLettersFromDB?.map(letter => ({
            id: letter.id,
            link_id: letter.link_id,
            recipient_name: letter.recipient_name,
            song_title: letter.song_title,
            user_id: letter.user_id,
            anonymous_id: letter.anonymous_id,
            created_at: letter.created_at
          })) || []
        }

        // 查询匿名用户的letters
        const currentAnonymousId = user?.anonymous_id || localStorage.getItem('anonymous_id')
        if (currentAnonymousId) {
          const { data: anonLettersFromDB } = await supabase
            .from('letters')
            .select('*')
            .eq('anonymous_id', currentAnonymousId)
            .order('created_at', { ascending: false })

          debug.supabaseData.anonLettersFromDB = anonLettersFromDB?.map(letter => ({
            id: letter.id,
            link_id: letter.link_id,
            recipient_name: letter.recipient_name,
            song_title: letter.song_title,
            user_id: letter.user_id,
            anonymous_id: letter.anonymous_id,
            created_at: letter.created_at
          })) || []
        }
      }

      // 6. 分析问题
      debug.analysis = {
        localLettersCount: debug.localStorage.letters?.length || 0,
        remoteLettersCount: debug.letterServiceData.userLettersCount || 0,
        userIdMatch: debug.localStorage.letters?.filter((l: any) => 
          user ? l.user_id === user.id : false
        ).length || 0,
        anonymousIdMatch: debug.localStorage.letters?.filter((l: any) => 
          l.anonymous_id === (user?.anonymous_id || localStorage.getItem('anonymous_id'))
        ).length || 0,
        possibleIssues: []
      }

      // 检测可能的问题
      if (debug.localStorage.letters?.length > 0 && debug.letterServiceData.userLettersCount === 0) {
        debug.analysis.possibleIssues.push('本地有数据，但getUserLetters返回空 - 可能是用户身份匹配问题')
      }

      if (debug.userContext.anonymousId !== debug.localStorage.anonymous_id) {
        debug.analysis.possibleIssues.push('Context中的anonymousId与localStorage不一致')
      }

      if (debug.userServiceData.getAnonymousId !== debug.localStorage.anonymous_id) {
        debug.analysis.possibleIssues.push('UserService的anonymousId与localStorage不一致')
      }

    } catch (error) {
      debug.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }
    }

    setDebugData(debug)
    setLoading(false)
  }

  useEffect(() => {
    debugUserLetters()
  }, [user, anonymousId, isAuthenticated])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 User Letters Debug Tool</h1>
      
      <button 
        onClick={debugUserLetters} 
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? '🔄 Debugging...' : '🔍 Run Debug Analysis'}
      </button>

      {debugData.timestamp && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', fontSize: '12px' }}>
          <h3>Debug Results ({debugData.timestamp})</h3>
          
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <h4>🔐 User Context</h4>
              <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify(debugData.userContext, null, 2)}
              </pre>
            </div>

            <div>
              <h4>💾 localStorage</h4>
              <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify({
                  anonymous_id: debugData.localStorage?.anonymous_id,
                  lettersCount: debugData.localStorage?.letters?.length,
                  user_agent: debugData.localStorage?.user_agent
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h4>👤 UserService Data</h4>
              <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify(debugData.userServiceData, null, 2)}
              </pre>
            </div>

            <div>
              <h4>📝 LetterService Data</h4>
              <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify({
                  userLettersCount: debugData.letterServiceData?.userLettersCount,
                  sample: debugData.letterServiceData?.userLetters?.slice(0, 2)
                }, null, 2)}
              </pre>
            </div>
          </div>

          {debugData.supabaseData && (
            <div style={{ marginTop: '1rem' }}>
              <h4>🗄️ Supabase Data</h4>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div>
                  <h5>All Letters (Latest 10)</h5>
                  <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                    {JSON.stringify(debugData.supabaseData.allLetters?.slice(0, 3), null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h5>User Letters</h5>
                  <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                    {JSON.stringify(debugData.supabaseData.userLettersFromDB || 'No user logged in', null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h5>Anonymous Letters</h5>
                  <pre style={{ backgroundColor: '#e9ecef', padding: '0.5rem', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                    {JSON.stringify(debugData.supabaseData.anonLettersFromDB || [], null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {debugData.analysis && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
              <h4>📊 Analysis</h4>
              <div>
                <strong>Local Letters:</strong> {debugData.analysis.localLettersCount}<br/>
                <strong>Remote Letters:</strong> {debugData.analysis.remoteLettersCount}<br/>
                <strong>User ID Matches:</strong> {debugData.analysis.userIdMatch}<br/>
                <strong>Anonymous ID Matches:</strong> {debugData.analysis.anonymousIdMatch}<br/>
              </div>
              
              {debugData.analysis.possibleIssues?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>🚨 Possible Issues:</strong>
                  <ul>
                    {debugData.analysis.possibleIssues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {debugData.localStorage?.letters?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>📋 Local Letters Details</h4>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {debugData.localStorage.letters.map((letter: any, i: number) => (
                  <div key={i} style={{ margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#f1f3f4', borderRadius: '4px' }}>
                    <strong>{letter.recipient_name}</strong> - {letter.song_title}<br/>
                    <small>User ID: {letter.user_id || 'null'} | Anonymous ID: {letter.anonymous_id || 'null'}</small><br/>
                    <small>Created: {letter.created_at}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debugData.error && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '6px' }}>
              <h4>❌ Error</h4>
              <pre>{JSON.stringify(debugData.error, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}