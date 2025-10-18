'use client'

import { useState } from 'react'
import { Letter } from '@/lib/supabase'
import { SocialShareService, ShareOptions } from '@/lib/socialShare'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  letter: Letter
  onShareSuccess?: (platform: string) => void
}

export default function ShareModal({ isOpen, onClose, letter, onShareSuccess }: ShareModalProps) {
  const [customMessage, setCustomMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

  const handleShare = async (platform: ShareOptions['platform']) => {
    setLoading(platform)
    
    try {
      const success = await SocialShareService.share({
        platform,
        letter,
        customMessage: customMessage || undefined
      })

      if (success) {
        if (platform === 'copy') {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        
        await SocialShareService.trackShare(letter, platform)
        onShareSuccess?.(platform)
      }
    } catch (error) {
      console.error('Share failed:', error)
    } finally {
      setLoading(null)
    }
  }

  const shareButtons = [
    { 
      platform: 'copy' as const, 
      icon: '📋', 
      label: '复制链接', 
      color: '#6c757d',
      description: '复制到剪贴板分享'
    },
    { 
      platform: 'whatsapp' as const, 
      icon: '💬', 
      label: 'WhatsApp', 
      color: '#25D366',
      description: '发送到WhatsApp好友'
    },
    { 
      platform: 'telegram' as const, 
      icon: '✈️', 
      label: 'Telegram', 
      color: '#0088cc',
      description: '分享到Telegram'
    },
    { 
      platform: 'twitter' as const, 
      icon: '🐦', 
      label: 'Twitter', 
      color: '#1DA1F2',
      description: '发布到Twitter'
    },
    { 
      platform: 'facebook' as const, 
      icon: '📘', 
      label: 'Facebook', 
      color: '#4267B2',
      description: '分享到Facebook'
    },
    { 
      platform: 'email' as const, 
      icon: '📧', 
      label: '邮件', 
      color: '#EA4335',
      description: '通过邮件发送'
    },
    { 
      platform: 'sms' as const, 
      icon: '💬', 
      label: '短信', 
      color: '#34C759',
      description: '通过短信发送'
    }
  ]

  const recommendedPlatforms = SocialShareService.getRecommendedSharePlatforms()
  const filteredButtons = shareButtons.filter(btn => recommendedPlatforms.includes(btn.platform))

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>分享音乐信件</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="letter-preview">
          <img src={letter.song_album_cover} alt={letter.song_title} />
          <div className="letter-info">
            <h4>致：{letter.recipient_name}</h4>
            <p>{letter.song_title} - {letter.song_artist}</p>
          </div>
        </div>

        <div className="custom-message-section">
          <label htmlFor="customMessage">自定义分享文案（可选）</label>
          <textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="添加你的个人消息..."
            rows={3}
          />
        </div>

        <div className="share-buttons">
          {filteredButtons.map((button) => (
            <button
              key={button.platform}
              onClick={() => handleShare(button.platform)}
              disabled={loading === button.platform}
              className="share-button"
              style={{ borderColor: button.color }}
            >
              <span className="share-icon">{button.icon}</span>
              <div className="share-text">
                <span className="share-label">{button.label}</span>
                <span className="share-description">{button.description}</span>
              </div>
              {loading === button.platform && <span className="loading">⏳</span>}
              {button.platform === 'copy' && copied && <span className="success">✅</span>}
            </button>
          ))}
        </div>

        <div className="share-link-preview">
          <p>分享链接预览：</p>
          <code>{SocialShareService.generateShareUrl(letter.link_id)}</code>
        </div>
      </div>

      <style jsx>{`
        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .share-modal {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .share-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 16px;
          border-bottom: 1px solid #eee;
        }

        .share-modal-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.25rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background-color: #f5f5f5;
        }

        .letter-preview {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background: #f8f9fa;
          margin: 0 24px 20px;
          border-radius: 12px;
        }

        .letter-preview img {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 16px;
        }

        .letter-info h4 {
          margin: 0 0 4px 0;
          color: #333;
          font-size: 1rem;
        }

        .letter-info p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .custom-message-section {
          padding: 0 24px 20px;
        }

        .custom-message-section label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }

        .custom-message-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
        }

        .custom-message-section textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .share-buttons {
          padding: 0 24px;
          display: grid;
          gap: 12px;
        }

        .share-button {
          display: flex;
          align-items: center;
          padding: 16px;
          border: 2px solid #ddd;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .share-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .share-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .share-icon {
          font-size: 24px;
          margin-right: 16px;
        }

        .share-text {
          flex: 1;
        }

        .share-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .share-description {
          display: block;
          font-size: 0.85rem;
          color: #666;
        }

        .loading, .success {
          margin-left: 12px;
          font-size: 16px;
        }

        .share-link-preview {
          padding: 20px 24px;
          background: #f8f9fa;
          margin: 20px 24px 24px;
          border-radius: 8px;
        }

        .share-link-preview p {
          margin: 0 0 8px 0;
          color: #666;
          font-size: 0.9rem;
        }

        .share-link-preview code {
          display: block;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 0.85rem;
          color: #333;
          word-break: break-all;
        }

        @media (max-width: 768px) {
          .share-modal {
            margin: 20px;
            max-height: calc(100vh - 40px);
          }

          .share-modal-header, .letter-preview, .custom-message-section, .share-buttons {
            padding-left: 16px;
            padding-right: 16px;
          }

          .share-link-preview {
            margin-left: 16px;
            margin-right: 16px;
          }
        }
      `}</style>
    </div>
  )
}