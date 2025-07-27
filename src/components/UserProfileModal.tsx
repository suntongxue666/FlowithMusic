'use client'

import { useState, useRef, useEffect } from 'react'
import { userService } from '@/lib/userService'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSignOut?: () => void
  user: {
    avatar_url?: string
    display_name?: string
    email?: string
  }
}

export default function UserProfileModal({ isOpen, onClose, user, onSignOut }: UserProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        // 使用传入的自定义登出函数
        onSignOut()
      } else {
        // 使用默认的userService登出
        await userService.signOut()
        window.location.reload()
      }
      onClose()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="user-modal-overlay">
      <div className="user-modal" ref={modalRef}>
        {/* 用户头像和信息 */}
        <div className="user-modal-header">
          <div className="user-avatar-large">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="User Avatar" />
            ) : (
              <div className="avatar-placeholder">
                {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="user-info">
            <div className="user-name">{user.display_name || 'User'}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>

        {/* 社交媒体链接 */}
        <div className="social-links">
          <div className="social-item">
            <span className="social-label">WhatsApp:</span>
            <span className="social-value">-</span>
          </div>
          <div className="social-item">
            <span className="social-label">TikTok:</span>
            <span className="social-value">-</span>
          </div>
          <div className="social-item">
            <span className="social-label">Instagram:</span>
            <span className="social-value">-</span>
          </div>
          <div className="social-item">
            <span className="social-label">Facebook:</span>
            <span className="social-value">-</span>
          </div>
        </div>

        {/* 登出按钮 */}
        <button className="sign-out-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <style jsx>{`
        .user-modal-overlay {
          position: fixed;
          top: 0;
          right: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .user-modal {
          width: 240px;
          height: 600px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 24px;
          margin-top: 60px;
          margin-right: 20px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .user-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .user-avatar-large {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #333;
        }

        .user-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .user-info {
          text-align: center;
        }

        .user-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .user-email {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .social-links {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .social-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .social-label {
          font-size: 14px;
          font-weight: 500;
        }

        .social-value {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .sign-out-btn {
          width: 100%;
          padding: 12px 24px;
          background-color: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: auto;
        }

        .sign-out-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .user-modal {
            width: 200px;
            height: 500px;
            margin-right: 10px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}