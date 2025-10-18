'use client'

import { useState } from 'react'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing...')
    
    try {
      // 测试环境变量
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult(`Environment variables:
URL: ${supabaseUrl}
Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Not set'}

Step 1: Testing basic connectivity to Supabase...`)

      // 首先测试基本的连接性
      try {
        const basicResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey || '',
          }
        })
        
        setResult(prev => prev + `

Basic connectivity test:
Status: ${basicResponse.status}
Status Text: ${basicResponse.statusText}`)

        if (basicResponse.status === 404) {
          setResult(prev => prev + `

⚠️ 404 Error - This suggests the Supabase project might not exist or the URL is incorrect.`)
        }
      } catch (basicError) {
        setResult(prev => prev + `

❌ Basic connectivity failed: ${basicError}`)
      }

      setResult(prev => prev + `

Step 2: Testing letters table access...`)

      // 然后测试具体的表访问
      const response = await fetch(`${supabaseUrl}/rest/v1/letters?select=count&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })

      setResult(prev => prev + `

Letters table test:
Status: ${response.status}
Status Text: ${response.statusText}`)

      if (response.ok) {
        const data = await response.text()
        setResult(prev => prev + `

✅ SUCCESS! Response data: ${data}`)
      } else {
        const errorText = await response.text()
        setResult(prev => prev + `

❌ HTTP Error: ${response.status} ${response.statusText}
Error body: ${errorText}`)
      }
    } catch (error) {
      setResult(prev => prev + `

❌ Network Error: ${error}
Error type: ${typeof error}
Error message: ${error instanceof Error ? error.message : 'Unknown'}
Stack: ${error instanceof Error ? error.stack : 'No stack'}`)
    } finally {
      setLoading(false)
    }
  }

  const testSupabaseClient = async () => {
    setLoading(true)
    setResult('Testing Supabase client...')
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      if (!supabase) {
        setResult('❌ Supabase client is null')
        return
      }

      setResult('✅ Supabase client created. Testing query...')

      const { data, error } = await supabase
        .from('letters')
        .select('count')
        .limit(1)

      if (error) {
        setResult(prev => prev + `

❌ Supabase Error:
Code: ${error.code}
Message: ${error.message}
Details: ${error.details}
Hint: ${error.hint}`)
      } else {
        setResult(prev => prev + `

✅ Supabase query successful!
Data: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setResult(prev => prev + `

❌ Client Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Supabase Connection Test</h1>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={testConnection}
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
          {loading ? 'Testing...' : 'Test Direct HTTP'}
        </button>
        
        <button 
          onClick={testSupabaseClient}
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
          {loading ? 'Testing...' : 'Test Supabase Client'}
        </button>
        
        <button 
          onClick={() => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL
            if (url) {
              window.open(url, '_blank')
            } else {
              alert('No Supabase URL found')
            }
          }}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#17a2b8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Open Supabase URL
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
        {result || 'Click a button to test Supabase connection...'}
      </div>
    </div>
  )
}