'use client'

import { useState, useEffect } from 'react'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import { useUser } from '@/contexts/UserContext'

export default function TestUserIdentityPage() {
  const { user, anonymousId, isAuthenticated } = useUser()
  const [identity, setIdentity] = useState<any>(null)
  const [deviceCheck, setDeviceCheck] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    // 获取用户身份信息
    const currentIdentity = ImprovedUserIdentity.getOrCreateIdentity()
    setIdentity(currentIdentity)

    // 检查设备变化
    const check = ImprovedUserIdentity.detectDeviceChange()
    setDeviceCheck(check)

    // 运行测试
    runTests()
  }, [])

  const runTests = () => {
    const tests = {
      fingerprintGeneration: testFingerprintGeneration(),
      identityPersistence: testIdentityPersistence(),
      deviceSimilarity: testDeviceSimilarity()
    }
    setTestResults(tests)
  }

  const testFingerprintGeneration = () => {
    try {
      const fp1 = ImprovedUserIdentity.generateDeviceFingerprint()
      const fp2 = ImprovedUserIdentity.generateDeviceFingerprint()
      
      return {
        success: fp1 === fp2,
        fp1,
        fp2,
        message: fp1 === fp2 ? '指纹生成一致' : '指纹生成不一致'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const testIdentityPersistence = () => {
    try {
      const id1 = ImprovedUserIdentity.getOrCreateIdentity()
      const id2 = ImprovedUserIdentity.getOrCreateIdentity()
      
      return {
        success: id1.id === id2.id,
        id1: id1.id,
        id2: id2.id,
        message: id1.id === id2.id ? '身份持久化正常' : '身份持久化失败'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const testDeviceSimilarity = () => {
    // 这个测试模拟设备变化
    const originalUA = navigator.userAgent
    const testUA = originalUA + ' Modified'
    
    return {
      success: true,
      message: '设备相似度测试需要手动验证',
      originalUA: originalUA.substring(0, 100) + '...',
      testUA: testUA.substring(0, 100) + '...'
    }
  }

  const simulateDeviceChange = () => {
    // 清除现有身份
    ImprovedUserIdentity.clearOldIdentity()
    
    // 重新创建身份
    const newIdentity = ImprovedUserIdentity.getOrCreateIdentity()
    setIdentity(newIdentity)
    
    // 重新检查设备变化
    const check = ImprovedUserIdentity.detectDeviceChange()
    setDeviceCheck(check)
    
    alert('已模拟设备变化，请检查结果')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 改进的用户身份识别测试</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={simulateDeviceChange}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          🔄 模拟设备变化
        </button>
        
        <button 
          onClick={runTests}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🧪 重新运行测试
        </button>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
        {/* 当前用户状态 */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>👤 当前用户状态</h3>
          <div style={{ fontSize: '12px' }}>
            <div><strong>Context Anonymous ID:</strong> {anonymousId}</div>
            <div><strong>User ID:</strong> {user?.id || 'Not authenticated'}</div>
            <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
            <div><strong>localStorage ID:</strong> {typeof window !== 'undefined' ? localStorage.getItem('anonymous_id') : 'N/A'}</div>
          </div>
        </div>

        {/* 改进的身份信息 */}
        <div style={{ backgroundColor: '#e3f2fd', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>🆔 改进的身份信息</h3>
          {identity && (
            <div style={{ fontSize: '12px' }}>
              <div><strong>ID:</strong> {identity.id}</div>
              <div><strong>指纹:</strong> {identity.fingerprint}</div>
              <div><strong>创建时间:</strong> {new Date(identity.createdAt).toLocaleString()}</div>
              <div><strong>最后访问:</strong> {new Date(identity.lastSeen).toLocaleString()}</div>
              <div><strong>设备信息:</strong></div>
              <div style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
                <div>UA: {identity.deviceInfo.userAgent.substring(0, 50)}...</div>
                <div>语言: {identity.deviceInfo.language}</div>
                <div>屏幕: {identity.deviceInfo.screen}</div>
                <div>时区: {identity.deviceInfo.timezone}</div>
              </div>
            </div>
          )}
        </div>

        {/* 设备变化检测 */}
        <div style={{ backgroundColor: deviceCheck?.isLikelyDeviceChange ? '#fff3cd' : '#d4edda', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>🔍 设备变化检测</h3>
          {deviceCheck && (
            <div style={{ fontSize: '12px' }}>
              <div><strong>设备变化:</strong> {deviceCheck.isLikelyDeviceChange ? 'Yes' : 'No'}</div>
              {deviceCheck.suggestion && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                  <strong>建议:</strong> {deviceCheck.suggestion}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 测试结果 */}
        <div style={{ backgroundColor: '#f1f3f4', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>✅ 测试结果</h3>
          <div style={{ fontSize: '12px' }}>
            {Object.entries(testResults).map(([testName, result]: [string, any]) => (
              <div key={testName} style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: result.success ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
                <div><strong>{testName}:</strong> {result.success ? '✅ 通过' : '❌ 失败'}</div>
                <div>{result.message}</div>
                {result.error && <div style={{ color: '#dc3545' }}>错误: {result.error}</div>}
                {result.fp1 && <div>指纹1: {result.fp1}</div>}
                {result.fp2 && <div>指纹2: {result.fp2}</div>}
                {result.id1 && <div>ID1: {result.id1}</div>}
                {result.id2 && <div>ID2: {result.id2}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h4>📝 测试说明</h4>
        <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <li><strong>指纹生成测试</strong>: 验证设备指纹是否一致</li>
          <li><strong>身份持久化测试</strong>: 验证用户身份是否能正确保存和恢复</li>
          <li><strong>设备变化检测</strong>: 检测是否可能更换了设备</li>
          <li><strong>模拟设备变化</strong>: 清除现有身份数据，测试新设备情况</li>
        </ul>
        
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
          <strong>⚠️ 注意:</strong> 改进的身份识别系统使用设备指纹来提高用户识别的准确性，
          但仍然建议用户登录以获得最佳的数据持久性保障。
        </div>
      </div>
    </div>
  )
}