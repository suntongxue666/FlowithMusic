'use client'

import { useState, useEffect } from 'react'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import { useUser } from '@/contexts/UserContext'

interface UserIdentityNotificationProps {
  className?: string
}

export default function UserIdentityNotification({ className }: UserIdentityNotificationProps) {
  const { isAuthenticated, signInWithGoogle } = useUser()
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'device-change' | 'long-absence' | 'first-time'
  }>({ show: false, message: '', type: 'first-time' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isAuthenticated || dismissed) return

    // 检查设备变化
    const deviceCheck = ImprovedUserIdentity.detectDeviceChange()
    
    if (deviceCheck.isLikelyDeviceChange) {
      setNotification({
        show: true,
        message: deviceCheck.suggestion,
        type: 'device-change'
      })
    } else if (deviceCheck.suggestion) {
      setNotification({
        show: true,
        message: deviceCheck.suggestion,
        type: 'long-absence'
      })
    } else {
      // 检查是否是新用户（有本地Letters但未登录）
      const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
      if (localLetters.length >= 2) { // 用户已经创建了一些Letters
        setNotification({
          show: true,
          message: '您已经创建了一些音乐信息！登录可以永久保存并在任何设备上访问它们。',
          type: 'first-time'
        })
      }
    }
  }, [isAuthenticated, dismissed])

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setNotification(prev => ({ ...prev, show: false }))
    
    // 记住用户已经关闭了提示（24小时内不再显示）
    localStorage.setItem('identity_notification_dismissed', Date.now().toString())
  }

  // 检查是否已经关闭过提示（24小时内）
  useEffect(() => {
    const dismissed = localStorage.getItem('identity_notification_dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) {
        setDismissed(true)
      } else {
        localStorage.removeItem('identity_notification_dismissed')
      }
    }
  }, [])

  if (!notification.show || isAuthenticated || dismissed) {
    return null
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'device-change': return '🔄'
      case 'long-absence': return '👋'
      case 'first-time': return '🎵'
      default: return '💾'
    }
  }

  const getTitle = () => {
    switch (notification.type) {
      case 'device-change': return '设备变化检测'
      case 'long-absence': return '欢迎回来'
      case 'first-time': return '保存您的音乐收藏'
      default: return '保存数据'
    }
  }

  return (
    <div 
      className={`user-identity-notification ${className || ''}`}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        maxWidth: '400px',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        padding: '1.5rem',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .close-btn {
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .close-btn:hover {
          color: #666;
        }
        
        .sign-in-btn {
          background: linear-gradient(135deg, #1DB954, #1ed760);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          width: 100%;
          margin-top: 1rem;
        }
        
        .sign-in-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
        }
        
        .later-btn {
          background: none;
          border: 1px solid #ddd;
          color: #666;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          margin-top: 0.5rem;
          width: 100%;
          transition: all 0.2s ease;
        }
        
        .later-btn:hover {
          background: #f5f5f5;
        }
      `}</style>
      
      <button className="close-btn" onClick={handleDismiss}>
        ×
      </button>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ fontSize: '2rem', flexShrink: 0 }}>
          {getIcon()}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '1.1rem', 
            fontWeight: '600',
            color: '#333'
          }}>
            {getTitle()}
          </h3>
          
          <p style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '0.9rem', 
            lineHeight: '1.4',
            color: '#666'
          }}>
            {notification.message}
          </p>
          
          <button className="sign-in-btn" onClick={handleSignIn}>
            🔗 通过Google登录保存
          </button>
          
          <button className="later-btn" onClick={handleDismiss}>
            稍后提醒
          </button>
        </div>
      </div>
    </div>
  )
}