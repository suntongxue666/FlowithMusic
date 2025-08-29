'use client'

import { useState } from 'react'
import { userService } from '@/lib/userService'
import { AnonymousUserService } from '@/lib/anonymousUserService'
import AnonymousAvatar from '@/components/AnonymousAvatar'

export default function TestNewFeaturesPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [anonymousUser, setAnonymousUser] = useState<any>(null)

  const testInteractionData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/letters/2025082917203godTJ/interactions')
      const data = await response.json()
      setResult({ type: 'interactions', data })
    } catch (error) {
      setResult({ type: 'error', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testAnonymousUser = async () => {
    setLoading(true)
    try {
      const user = await AnonymousUserService.getOrCreateAnonymousUser()
      setAnonymousUser(user)
      setResult({ type: 'anonymous_user', data: user })
    } catch (error) {
      setResult({ type: 'error', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testSocialMediaUpdate = async () => {
    setLoading(true)
    try {
      const currentUser = userService.getCurrentUser()
      if (!currentUser) {
        throw new Error('需要先登录')
      }

      const updatedUser = await userService.updateSocialMedia({
        whatsapp: '+1234567890',
        instagram: 'test_user',
        tiktok: '@test_user'
      })
      
      setResult({ type: 'social_media_update', data: updatedUser })
    } catch (error) {
      setResult({ type: 'error', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testViewSocialMedia = async () => {
    setLoading(true)
    try {
      const currentUser = userService.getCurrentUser()
      if (!currentUser) {
        throw new Error('需要先登录')
      }

      // 尝试查看自己的社交媒体信息
      const socialMedia = await userService.getUserSocialMedia(currentUser.id)
      setResult({ type: 'view_social_media', data: socialMedia })
    } catch (error) {
      setResult({ type: 'error', error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>测试新功能</h1>
      
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={testInteractionData} disabled={loading}>
          1. 测试互动数据记录
        </button>
        
        <button onClick={testAnonymousUser} disabled={loading}>
          2. 测试匿名用户系统
        </button>
        
        <button onClick={testSocialMediaUpdate} disabled={loading}>
          3. 测试社交媒体更新（需要登录）
        </button>
        
        <button onClick={testViewSocialMedia} disabled={loading}>
          4. 测试查看社交媒体信息（需要登录）
        </button>
      </div>

      {anonymousUser && (
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>匿名用户头像预览：</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AnonymousAvatar 
              emoji={anonymousUser.avatar_emoji}
              background={anonymousUser.avatar_background}
              displayName={anonymousUser.display_name}
              size="small"
            />
            <AnonymousAvatar 
              emoji={anonymousUser.avatar_emoji}
              background={anonymousUser.avatar_background}
              displayName={anonymousUser.display_name}
              size="medium"
            />
            <AnonymousAvatar 
              emoji={anonymousUser.avatar_emoji}
              background={anonymousUser.avatar_background}
              displayName={anonymousUser.display_name}
              size="large"
            />
          </div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>测试结果：</h2>
          <div style={{ 
            background: result.type === 'error' ? '#fee' : '#efe', 
            padding: '1rem', 
            borderRadius: '4px',
            border: `1px solid ${result.type === 'error' ? '#fcc' : '#cfc'}`
          }}>
            <strong>类型：</strong> {result.type}<br/>
            <pre style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '1rem', 
              borderRadius: '4px', 
              overflow: 'auto',
              marginTop: '1rem'
            }}>
              {JSON.stringify(result.data || result.error, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>功能说明：</h3>
        <ul>
          <li><strong>互动数据记录：</strong> 检查Letter互动是否正确记录到数据库</li>
          <li><strong>匿名用户系统：</strong> 生成Guest+8位数字ID，随机动物emoji头像</li>
          <li><strong>社交媒体更新：</strong> 登录用户可以编辑WhatsApp/TikTok/Instagram等</li>
          <li><strong>查看社交媒体：</strong> 查看他人信息需要消耗10积分</li>
          <li><strong>默认积分：</strong> 新用户默认10积分（已从100改为10）</li>
          <li><strong>Letter发送者显示：</strong> 在"Sent on"上方显示发送者头像和昵称</li>
        </ul>
      </div>
    </div>
  )
}