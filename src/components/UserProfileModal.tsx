'use client'

import { useState, useRef, useEffect } from 'react'
import { userService } from '@/lib/userService'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSignOut?: () => void
  user: {
    id?: string
    avatar_url?: string
    display_name?: string
    email?: string
    coins?: number
    social_media_info?: any
  }
}

interface SocialMedia {
  name: string
  value: string
  isEditing: boolean
}

export default function UserProfileModal({ isOpen, onClose, user, onSignOut }: UserProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  
  const [socialMedias, setSocialMedias] = useState<SocialMedia[]>([
    { name: 'WhatsApp', value: '', isEditing: false },
    { name: 'TikTok', value: '', isEditing: false },
    { name: 'Instagram', value: '', isEditing: false },
    { name: 'Facebook', value: '', isEditing: false },
    { name: 'X', value: '', isEditing: false }
  ])

  // 初始化社交媒体数据
  useEffect(() => {
    console.log('🔄 初始化社交媒体数据:', { 
      userObj: user,
      socialMediaInfo: user?.social_media_info,
      hasUserId: !!user?.id,
      userEmail: user?.email 
    })
    if (user?.social_media_info) {
      setSocialMedias(prev => prev.map(media => ({
        ...media,
        value: user.social_media_info?.[media.name.toLowerCase()] || ''
      })))
    } else {
      // 如果没有社交媒体信息，重置为空
      setSocialMedias(prev => prev.map(media => ({
        ...media,
        value: ''
      })))
    }
  }, [user, isOpen]) // 添加isOpen依赖，确保每次打开都重新初始化

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
      console.log('🚪 用户点击Sign out按钮')
      
      // 立即关闭弹窗，让用户看到变化
      onClose()
      
      // 立即执行本地状态清除，确保界面立即更新为未登录状态
      if (onSignOut) {
        await onSignOut()
      }
      
    } catch (error) {
      console.error('❌ Sign out操作失败:', error)
      // 即使出错也要关闭弹窗
      onClose()
    }
  }

  const toggleEdit = (index: number) => {
    setSocialMedias(prev => prev.map((media, i) => 
      i === index ? { ...media, isEditing: !media.isEditing } : media
    ))
  }

  const handleSave = async (index: number, value: string) => {
    setSaving(true)
    try {
      console.log('🔄 开始保存社交媒体信息:', { index, value, mediaName: socialMedias[index].name })
      
      const mediaName = socialMedias[index].name.toLowerCase()
      
      // 立即更新UI状态，给用户即时反馈
      setSocialMedias(prev => prev.map((media, i) => 
        i === index ? { ...media, value, isEditing: false } : media
      ))
      
      // 异步保存到服务器
      const updatePromise = userService.updateSocialMedia({
        [mediaName]: value
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout, please try again')), 3000)
      )
      
      try {
        const updatedUser = await Promise.race([updatePromise, timeoutPromise]) as any
        console.log('✅ 社交媒体信息保存成功:', updatedUser.social_media_info)
      } catch (saveError) {
        console.error('❌ 后台保存失败，但UI已更新:', saveError)
        // UI已更新，不回滚，让用户知道保存可能失败
        if (saveError instanceof Error && saveError.message.includes('timeout')) {
          console.log('⏰ 保存超时，但UI已更新')
        }
      }
      
    } catch (error) {
      console.error('❌ 保存社交媒体信息失败:', error)
      // 如果出错，回滚UI状态
      setSocialMedias(prev => prev.map((media, i) => 
        i === index ? { ...media, isEditing: true } : media
      ))
      alert(`Save failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (index: number, value: string) => {
    setSocialMedias(prev => prev.map((media, i) => 
      i === index ? { ...media, value } : media
    ))
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
            <div className="user-coins">积分: {user.coins || 0}</div>
          </div>
        </div>

        {/* 社交媒体链接 */}
        <div className="social-links">
          {socialMedias.map((media, index) => (
            <div key={media.name} className="social-item">
              <div className="social-row">
                <span className="social-label">{media.name}:</span>
                <button 
                  className="edit-btn"
                  onClick={() => media.isEditing ? handleSave(index, media.value) : toggleEdit(index)}
                  disabled={saving && media.isEditing}
                >
                  {saving && media.isEditing ? (
                    <div className="loading-spinner"></div>
                  ) : media.isEditing ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="m18.5 2.5 3 3L10 17l-4 1 1-4z"></path>
                    </svg>
                  )}
                </button>
              </div>
              <div className="social-input-row">
                {media.isEditing ? (
                  <input
                    type="text"
                    value={media.value}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder={media.name === 'WhatsApp' ? 'Enter your phone No.' : 'Enter unique username'}
                    className="social-input"
                    autoFocus
                  />
                ) : (
                  <span className="social-value">{media.value || '-'}</span>
                )}
              </div>
            </div>
          ))}
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
          width: 280px;
          height: 650px;
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
          gap: 8px; /* 头像和用户名之间距离改为原来的50% (16px * 0.5 = 8px) */
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

        .user-coins {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        .social-links {
          display: flex;
          flex-direction: column;
          gap: 1.5px; /* 邮箱下方白线与WhatsApp行距改为原来的50% (3px * 0.5 = 1.5px) */
          flex: 1;
        }

        .social-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 3px; /* 减少底部间距到原来的25% (12px * 0.25 = 3px) */
        }

        .social-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .social-label {
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .edit-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          padding: 2px; /* 改为2像素 */
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-btn:hover {
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .edit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .social-input-row {
          width: 100%;
        }

        .social-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: none; /* 去掉边框 */
          border-radius: 4px;
          padding: 2px 4px; /* 输入文本提醒的Padding改为2px 4px */
          color: white;
          font-size: 14px;
          outline: none;
        }

        .social-input:focus {
          background: rgba(255, 255, 255, 0.15);
        }

        .social-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .social-value {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          word-break: break-all;
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
            width: 240px;
            height: 600px;
            margin-right: 10px;
            padding: 20px;
          }

          .user-avatar-large {
            width: 32px;
            height: 32px;
          }

          .avatar-placeholder {
            font-size: 16px;
          }

          .user-name {
            font-size: 16px;
          }

          .user-email {
            font-size: 12px;
          }

          .social-label {
            font-size: 13px;
          }

          .social-input {
            font-size: 13px;
            padding: 6px 10px;
          }

          .social-value {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}