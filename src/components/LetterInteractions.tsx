'use client'

import { useState, useEffect } from 'react'
import { ImprovedUserIdentity } from '@/lib/improvedUserIdentity'
import { useUser } from '@/contexts/UserContext'

interface InteractionData {
  emoji: string
  label: string
  count: number
}

interface LetterInteractionsProps {
  letterId: string
}

export default function LetterInteractions({ letterId }: LetterInteractionsProps) {
  console.log('🎭 LetterInteractions组件渲染，letterId:', letterId)
  
  // 获取当前用户信息（登录状态）
  const { user, isAuthenticated } = useUser()
  
  const [interactions, setInteractions] = useState<InteractionData[]>([
    { emoji: '🩵', label: 'Feel', count: 0 },
    { emoji: '🥺', label: 'Tear', count: 0 },
    { emoji: '🎵', label: 'Vibe', count: 0 },
    { emoji: '🫶', label: 'Hug', count: 0 },
    { emoji: '💌', label: 'Reply', count: 0 }
  ])

  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载现有的互动数据
  useEffect(() => {
    console.log('🔥 useEffect 触发 - letterId:', letterId, 'loading:', loading)
    
    const loadInteractionStats = async () => {
      console.log('🔄 开始加载互动统计函数执行')
      try {
        console.log('🔄 开始加载互动统计，letterId:', letterId)
        const url = `/api/letters/${letterId}/interactions`
        console.log('📡 请求URL:', url)
        
        const response = await fetch(url)
        console.log('📡 API响应状态:', response.status, response.ok)
        console.log('📡 响应headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 获取到的统计数据:', data)
          
          if (data.success && data.stats) {
            console.log('✅ 统计数据有效，开始更新计数')
            console.log('原始stats数据:', data.stats)
            console.log('当前interactions状态:', interactions)
            
            // 更新现有的互动数据
            setInteractions(prev => {
              const updated = prev.map(item => {
                const stat = data.stats.find((s: any) => s.emoji === item.emoji)
                const newCount = stat ? stat.count : 0
                console.log(`${item.emoji} ${item.label}: ${item.count} -> ${newCount}`)
                return stat ? { ...item, count: stat.count } : item
              })
              console.log('更新后的interactions:', updated)
              return updated
            })
          } else {
            console.warn('⚠️ 统计数据格式不正确:', data)
          }
        } else {
          console.error('❌ API请求失败:', response.status, response.statusText)
          // 尝试读取错误响应
          try {
            const errorText = await response.text()
            console.error('错误响应内容:', errorText)
          } catch (e) {
            console.error('无法读取错误响应')
          }
        }
      } catch (error) {
        console.error('💥 加载互动统计失败:', error)
      } finally {
        console.log('🏁 加载统计完成，设置loading为false')
        setLoading(false)
      }
    }

    if (letterId) {
      console.log('✅ letterId存在，开始加载统计')
      loadInteractionStats()
    } else {
      console.log('❌ letterId不存在，跳过加载')
      setLoading(false)
    }
  }, [letterId])

  const handleInteraction = async (index: number) => {
    // 防止重复点击
    if (animatingIndex !== null) return

    setAnimatingIndex(index)
    
    const interaction = interactions[index]
    
    console.log('🎯 处理互动点击:', {
      emoji: interaction.emoji,
      isAuthenticated,
      userId: user?.id,
      userDisplayName: user?.display_name,
      userEmail: user?.email
    })
    
    // 优先使用登录用户信息，否则使用匿名身份
    let userInfo
    if (isAuthenticated && user) {
      // 已登录用户
      userInfo = {
        user_id: user.id,
        user_display_name: user.display_name || user.email?.split('@')[0] || 'User',
        user_avatar_url: user.avatar_url,
        anonymous_id: user.anonymous_id
      }
      
      // 设置登录用户的cookie，确保API能识别
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=31536000; SameSite=Lax`
      if (user.anonymous_id) {
        document.cookie = `anonymous_id=${encodeURIComponent(user.anonymous_id)}; path=/; max-age=31536000; SameSite=Lax`
      }
    } else {
      // 匿名用户
      const userIdentity = ImprovedUserIdentity.getOrCreateIdentity()
      userInfo = {
        user_id: null,
        user_display_name: 'Anonymous',
        user_avatar_url: null,
        anonymous_id: userIdentity.id
      }
      
      // 设置匿名用户cookie
      document.cookie = `anonymous_id=${encodeURIComponent(userIdentity.id)}; path=/; max-age=31536000; SameSite=Lax`
    }
    
    console.log('👤 使用的用户信息:', userInfo)
    
    // 立即更新本地计数 (乐观更新)
    setInteractions(prev => prev.map((item, i) => 
      i === index ? { ...item, count: item.count + 1 } : item
    ))
    
    // 上报互动数据
    try {
      const response = await fetch(`/api/letters/${letterId}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji: interaction.emoji,
          label: interaction.label,
          // 在请求体中也传递用户信息以确保准确性
          userInfo: userInfo
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('💝 互动记录已上报:', result)
        
        // 使用服务器返回的真实计数更新本地状态
        if (result.totalCount !== undefined) {
          setInteractions(prev => prev.map((item, i) => 
            i === index ? { ...item, count: result.totalCount } : item
          ))
        }
      } else {
        console.warn('⚠️ 互动记录上报失败')
        // 乐观更新已经完成，保持本地状态
      }
    } catch (error) {
      console.error('💥 互动记录上报错误:', error)
      // 乐观更新已经完成，保持本地状态
    }

    // 重置动画状态
    setTimeout(() => {
      setAnimatingIndex(null)
    }, 6000) // 匹配6秒动画时长
  }

  return (
    <div className="letter-interactions">
      {loading ? (
        <div className="interactions-loading">
          <div className="loading-dots">
            <span>Loading</span>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        </div>
      ) : (
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
                <span className={`count-number ${animatingIndex === index ? 'count-pop' : ''}`}>
                  {interaction.count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

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

        .interactions-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }

        .loading-dots {
          display: flex;
          align-items: center;
          gap: 2px;
          color: #666;
          font-size: 14px;
        }

        .loading-dots span:nth-child(2),
        .loading-dots span:nth-child(3),
        .loading-dots span:nth-child(4) {
          animation: loadingDots 1.5s infinite;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.2s;
        }

        .loading-dots span:nth-child(4) {
          animation-delay: 0.4s;
        }

        @keyframes loadingDots {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
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
          z-index: 1;
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
          z-index: 10000;
        }

        .particle {
          position: absolute;
          font-size: 0.5rem;
          opacity: 0;
          animation: particleFloat 6s ease-out forwards;
          left: 50%;
          top: 50%;
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
            font-size: 0.5rem;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0px);
          }
          15% {
            opacity: 1;
            font-size: 2rem;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-150px);
          }
          40% {
            opacity: 1;
            font-size: 4rem;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-375px);
          }
          70% {
            opacity: 0.8;
            font-size: 5rem;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-600px);
          }
          100% {
            opacity: 0;
            font-size: 5rem;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-750px);
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

        .count-number {
          position: absolute;
          top: 4px;
          right: 6px;
          color: #333;
          font-size: 10px;
          font-weight: 500;
          min-width: 12px;
          text-align: center;
          line-height: 1;
          pointer-events: none;
          z-index: 2;
          transition: transform 0.2s ease;
        }

        .count-number.count-pop {
          animation: numberPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes numberPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
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

          .count-number {
            top: -2px;
            right: 4px;
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  )
}