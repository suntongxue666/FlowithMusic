'use client'

import { useRouter } from 'next/navigation'

interface PremiumLimitModalProps {
  onClose: () => void
  type: 'daily_limit' | 'notif_lock'
}

export default function PremiumLimitModal({ onClose, type }: PremiumLimitModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onClose()
    router.push('/premium')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crown-icon">👑</div>
        
        {type === 'daily_limit' ? (
          <>
            <h3>Daily Limit Reached</h3>
            <p className="modal-text">
              You've sent 2 letters today! Upgrade to Premium for <strong>unlimited</strong> daily letters.
            </p>
          </>
        ) : (
          <>
            <h3>Unlock Details</h3>
            <p className="modal-text">
              Upgrade to Premium to see who visited your profile and who reacted to your letters!
            </p>
          </>
        )}

        <div className="benefits-mini">
          <div>✨ Unlimited Letters</div>
          <div>👁️ Profile Visitors</div>
          <div>🫶 Emoji Reactions</div>
        </div>

        <button className="premium-btn" onClick={handleUpgrade}>
          👑 Premium
        </button>
        
        <button className="close-link" onClick={onClose}>
          Maybe later
        </button>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: white;
          padding: 2.5rem 2rem;
          border-radius: 24px;
          width: 90%;
          max-width: 360px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .crown-icon {
          font-size: 48px;
          margin-bottom: 1rem;
        }

        h3 {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: #111;
        }

        .modal-text {
          color: #666;
          font-size: 15px;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .benefits-mini {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 13px;
          font-weight: 600;
          color: #444;
        }

        .premium-btn {
          width: 100%;
          padding: 14px;
          background: black;
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .premium-btn:hover {
          transform: scale(1.02);
        }

        .close-link {
          margin-top: 1rem;
          background: none;
          border: none;
          color: #999;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
