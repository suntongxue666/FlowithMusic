'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

export default function OAuthConfigPage() {
  const [currentDomain, setCurrentDomain] = useState('')
  const [supabaseUrl, setSupabaseUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.origin)
      setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    }
  }, [])

  const requiredRedirectURIs = [
    `${supabaseUrl}/auth/v1/callback`,
    `${currentDomain}/auth/callback`,
    'http://localhost:3000/auth/callback', // 开发环境
    'https://flowithmusic.vercel.app/auth/callback' // 生产环境
  ]

  return (
    <main>
      <Header />
      <div className="legal-container">
        <div className="legal-content">
          <h1>🔧 Google OAuth 配置指南</h1>
          
          <section>
            <h2>🚨 当前问题</h2>
            <p>Google OAuth出现redirect_uri_mismatch错误，需要在Google Cloud Console中配置正确的重定向URI。</p>
          </section>

          <section>
            <h2>📋 需要配置的重定向URI</h2>
            <p>请在Google Cloud Console中添加以下重定向URI：</p>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px', 
              fontFamily: 'monospace',
              marginBottom: '1rem'
            }}>
              {requiredRedirectURIs.map((uri, index) => (
                <div key={index} style={{ marginBottom: '0.5rem' }}>
                  <strong>{index + 1}.</strong> {uri}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>🛠️ 配置步骤</h2>
            <ol>
              <li><strong>登录Google Cloud Console</strong>
                <p>访问 <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">https://console.cloud.google.com/</a></p>
              </li>
              
              <li><strong>选择项目</strong>
                <p>确保选择了正确的项目（包含您的OAuth客户端ID）</p>
              </li>
              
              <li><strong>进入API和服务</strong>
                <p>左侧菜单 → API和服务 → 凭据</p>
              </li>
              
              <li><strong>编辑OAuth 2.0客户端</strong>
                <p>找到客户端ID: <code>272855125817-c79aijujptu5ve6f3hlmi9cntlh8g356.apps.googleusercontent.com</code></p>
                <p>点击编辑按钮（铅笔图标）</p>
              </li>
              
              <li><strong>添加授权重定向URI</strong>
                <p>在"授权重定向URI"部分，添加上面列出的所有URI</p>
              </li>
              
              <li><strong>保存配置</strong>
                <p>点击"保存"按钮</p>
              </li>
            </ol>
          </section>

          <section>
            <h2>🔍 当前环境信息</h2>
            <div style={{ 
              background: '#f0f8ff', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p><strong>当前域名：</strong> {currentDomain}</p>
              <p><strong>Supabase URL：</strong> {supabaseUrl}</p>
              <p><strong>Google Client ID：</strong> 272855125817-c79aijujptu5ve6f3hlmi9cntlh8g356.apps.googleusercontent.com</p>
            </div>
          </section>

          <section>
            <h2>✅ 配置验证</h2>
            <p>配置完成后，请等待几分钟让更改生效，然后测试Google登录功能。</p>
            <div style={{ 
              background: '#d4edda', 
              border: '1px solid #c3e6cb',
              padding: '1rem', 
              borderRadius: '8px',
              marginTop: '1rem'
            }}>
              <strong>💡 提示：</strong> 如果仍然遇到问题，请检查：
              <ul>
                <li>所有重定向URI都已正确添加</li>
                <li>URI拼写完全正确（包括协议和路径）</li>
                <li>已保存更改并等待生效</li>
                <li>清除浏览器缓存后重试</li>
              </ul>
            </div>
          </section>

          <section>
            <h2>🔗 相关文档</h2>
            <ul>
              <li><a href="https://developers.google.com/identity/protocols/oauth2/web-server?hl=zh-cn#authorization-errors-redirect-uri-mismatch" target="_blank" rel="noopener noreferrer">
                Google OAuth 2.0 redirect_uri_mismatch 错误解决方案
              </a></li>
              <li><a href="https://supabase.com/docs/guides/auth/social-login/auth-google" target="_blank" rel="noopener noreferrer">
                Supabase Google OAuth 配置指南
              </a></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}