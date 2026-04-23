'use client'

import { useState, useEffect } from 'react'

interface Buyer {
  id: string
  name: string
  avatar: string | null
  time: string
}

export default function RecentBuyersMarquee({ fontSize = '13px' }: { fontSize?: string }) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const res = await fetch('/api/premium/recent-buyers')
        const data = await res.json()
        if (data.success && data.buyers?.length > 0) {
          setBuyers(data.buyers)
        }
      } catch (e) {
        console.error('Marquee fetch error:', e)
      }
    }
    fetchBuyers()
    const interval = setInterval(fetchBuyers, 3600000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (buyers.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % buyers.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [buyers])

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 60) {
      return `bought before ${diffMins < 1 ? 'just now' : `${diffMins} mins`}`
    } else {
      // 按照用户要求：不计算日期，仅保留小时计算（例如 48 hours）
      return `bought before ${diffHours} hours`
    }
  }

  if (buyers.length === 0) return null

  return (
    <div className="recent-buyers-minimal">
      <div className="marquee-wrapper">
        <div className="marquee-content" style={{ transform: `translateY(-${currentIndex * 32}px)` }}>
          {buyers.map((buyer) => (
            <div key={buyer.id} className="buyer-item">
              <div className="buyer-avatar">
                {buyer.avatar ? (
                  <img src={buyer.avatar} alt={buyer.name} />
                ) : (
                  <div className="avatar-placeholder">{buyer.name.charAt(0)}</div>
                )}
              </div>
              <p className="buyer-text" style={{ fontSize }}>
                <span className="buyer-name">{buyer.name}</span> {formatTime(buyer.time)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .recent-buyers-minimal {
          height: 32px;
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          pointer-events: none;
        }

        .marquee-wrapper {
          height: 32px;
          position: relative;
          width: 100%;
        }

        .marquee-content {
          transition: transform 1.2s cubic-bezier(0.65, 0, 0.35, 1);
          height: 100%;
        }

        .buyer-item {
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .buyer-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid #eee;
        }

        .buyer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
          color: #999;
        }

        .buyer-text {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .buyer-name {
          font-weight: 600;
          color: #666;
        }
      `}</style>
    </div>
  )
}
