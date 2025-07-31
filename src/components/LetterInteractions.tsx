'use client'

import { useState } from 'react'

interface InteractionData {
  emoji: string
  label: string
  count: number
}

interface LetterInteractionsProps {
  letterId: string
}

export default function LetterInteractions({ letterId }: LetterInteractionsProps) {
  const [interactions, setInteractions] = useState<InteractionData[]>([
    { emoji: '🩵', label: 'Feel', count: 0 },
    { emoji: '🥺', label: 'Tear', count: 0 },
    { emoji: '🎵', label: 'Vibe', count: 0 },
    { emoji: '🫶', label: 'Hug', count: 0 },
    { emoji: '💌', label: 'Reply', count: 0 }
  ])

  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)

  const handleInteraction = (index: number) => {
    // 防止重复点击
    if (animatingIndex !== null) return

    setAnimatingIndex(index)
    
    // 更新计数
    setInteractions(prev => prev.map((item, i) => 
      i === index ? { ...item, count: item.count + 1 } : item
    ))

    // 重置动画状态
    setTimeout(() => {
      setAnimatingIndex(null)
    }, 1500)
  }

  return (
    <div className="letter-interactions">
      <div className="interactions-container">
        {interactions.map((interaction, index) => (
          <div 
            key={index}
            className={`interaction-item ${animatingIndex === index ? 'animating' : ''}`}
            onClick={() => handleInteraction(index)}
          >
            <div className="emoji-container">
              <span className="main-emoji">{interaction.emoji}</span>
              {animatingIndex === index && (
                <>
                  <div className="particle-container">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`particle particle-${i + 1}`}>
                        {interaction.emoji}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="interaction-label">{interaction.label}</span>
            {interaction.count > 0 && (
              <span className={`count-badge ${animatingIndex === index ? 'count-animating' : ''}`}>
                +{interaction.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 全屏庆祝效果 */}
      {animatingIndex !== null && (
        <div className="fullscreen-celebration">
          <div className="celebration-effects">
            <div className="confetti confetti-1">🎊</div>
            <div className="confetti confetti-2">🎊</div>
            <div className="confetti confetti-3">🎊</div>
            <div className="confetti confetti-4">🎊</div>
            <div className="sparkles sparkles-1">✨</div>
            <div className="sparkles sparkles-2">✨</div>
            <div className="sparkles sparkles-3">✨</div>
            <div className="sparkles sparkles-4">✨</div>
            <div className="sparkles sparkles-5">✨</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .letter-interactions {
          padding: 12px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .fullscreen-celebration {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .interactions-container {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .interaction-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          min-width: 60px;
        }

        .interaction-item:hover {
          background: transparent;
          transform: translateY(-2px);
        }

        .emoji-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .main-emoji {
          font-size: 1.5rem;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          display: block;
        }

        .interaction-item.animating .main-emoji {
          transform: scale(1.5);
          animation: bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.8); }
          100% { transform: scale(1.5); }
        }

        .particle-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .particle {
          position: absolute;
          font-size: 5rem;
          opacity: 0;
          animation: particleFloat 3s ease-out forwards;
        }

        .particle-1 {
          animation-delay: 0.1s;
          --angle: -30deg;
        }

        .particle-2 {
          animation-delay: 0.2s;
          --angle: 0deg;
        }

        .particle-3 {
          animation-delay: 0.3s;
          --angle: 30deg;
        }

        .particle-4 {
          animation-delay: 0.4s;
          --angle: 15deg;
        }

        .particle-5 {
          animation-delay: 0.5s;
          --angle: -15deg;
        }

        @keyframes particleFloat {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0px) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-100px) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-200px) scale(0.3);
          }
        }

        .celebration-effects {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti {
          position: absolute;
          font-size: 3rem;
          opacity: 0;
          animation: confettiRise 2.5s ease-out forwards;
        }

        .confetti-1 {
          bottom: 10%;
          left: 10%;
          animation-delay: 0.1s;
        }

        .confetti-2 {
          bottom: 15%;
          left: 80%;
          animation-delay: 0.3s;
        }

        .confetti-3 {
          bottom: 20%;
          left: 50%;
          animation-delay: 0.5s;
        }

        .confetti-4 {
          bottom: 25%;
          left: 25%;
          animation-delay: 0.7s;
        }

        .sparkles {
          position: absolute;
          font-size: 2rem;
          opacity: 0;
          animation: sparkleSpread 2s ease-out forwards;
        }

        .sparkles-1 {
          top: 20%;
          right: 15%;
          animation-delay: 0.2s;
        }

        .sparkles-2 {
          top: 30%;
          left: 10%;
          animation-delay: 0.4s;
        }

        .sparkles-3 {
          top: 15%;
          left: 70%;
          animation-delay: 0.6s;
        }

        .sparkles-4 {
          top: 40%;
          right: 30%;
          animation-delay: 0.8s;
        }

        .sparkles-5 {
          top: 25%;
          left: 50%;
          animation-delay: 1s;
        }

        @keyframes confettiRise {
          0% {
            opacity: 1;
            transform: translateY(0px) scale(0.3) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: translateY(-100px) scale(1) rotate(90deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-200px) scale(1.2) rotate(180deg);
          }
          75% {
            opacity: 0.8;
            transform: translateY(-300px) scale(0.8) rotate(270deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-400px) scale(0.3) rotate(360deg);
          }
        }

        @keyframes sparkleSpread {
          0% {
            opacity: 1;
            transform: scale(0.3) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: scale(1.5) rotate(90deg);
          }
          50% {
            opacity: 1;
            transform: scale(2) rotate(180deg);
          }
          75% {
            opacity: 0.8;
            transform: scale(1.2) rotate(270deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(360deg);
          }
        }

        .interaction-label {
          font-size: 10px;
          font-weight: 500;
          color: #666;
          text-align: center;
        }

        .count-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
          color: white;
          font-size: 0.7rem;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transform: scale(1);
          transition: all 0.3s ease;
        }

        .count-badge.count-animating {
          animation: countPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes countPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        /* 移动端优化 */
        @media (max-width: 768px) {
          .letter-interactions {
            padding: 8px;
          }

          .interactions-container {
            gap: 0.5rem;
          }

          .interaction-item {
            min-width: 50px;
            padding: 0.5rem 0.25rem;
          }

          .emoji-container {
            width: 20px;
            height: 20px;
          }

          .main-emoji {
            font-size: 1.2rem;
          }

          .interaction-label {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  )
}