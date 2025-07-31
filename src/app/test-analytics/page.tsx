'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

export default function TestAnalyticsPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const testViewRecording = async () => {
    setLoading(true)
    try {
      const testLinkId = 'test-link-' + Date.now()
      
      const response = await fetch(`/api/letters/${testLinkId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        type: 'View Recording',
        success: response.ok,
        data: result,
        timestamp: new Date().toISOString()
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'View Recording',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const testInteractionRecording = async () => {
    setLoading(true)
    try {
      const testLinkId = 'test-link-' + Date.now()
      
      const response = await fetch(`/api/letters/${testLinkId}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji: '🩵',
          label: 'Feel'
        })
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        type: 'Interaction Recording',
        success: response.ok,
        data: result,
        timestamp: new Date().toISOString()
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Interaction Recording',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const testInteractionStats = async () => {
    setLoading(true)
    try {
      const testLinkId = 'test-link-analytics'
      
      const response = await fetch(`/api/letters/${testLinkId}/interactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        type: 'Interaction Stats',
        success: response.ok,
        data: result,
        timestamp: new Date().toISOString()
      }])
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Interaction Stats',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <main>
      <Header />
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          Analytics Testing
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button 
            onClick={testViewRecording}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Test View Recording
          </button>
          
          <button 
            onClick={testInteractionRecording}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Test Interaction Recording
          </button>
          
          <button 
            onClick={testInteractionStats}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Test Interaction Stats
          </button>
          
          <button 
            onClick={clearResults}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear Results
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Testing...</p>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Test Results</h2>
          
          {testResults.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No test results yet. Click the buttons above to run tests.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  style={{
                    background: result.success ? '#d4edda' : '#f8d7da',
                    border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
                    borderRadius: '6px',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ color: result.success ? '#155724' : '#721c24' }}>
                      {result.type} - {result.success ? 'SUCCESS' : 'FAILED'}
                    </strong>
                    <small style={{ color: '#666' }}>
                      {new Date(result.timestamp).toLocaleString()}
                    </small>
                  </div>
                  
                  <pre style={{
                    background: 'rgba(0,0,0,0.1)',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    margin: 0
                  }}>
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}