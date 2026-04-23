'use client'

import { useState, useEffect } from 'react'
import MusicCard from './MusicCard'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

interface RecentPostsCarouselProps {
  initialLetters?: Letter[]
  cardsPerPage?: 3 | 6 // 支持3个或6个卡片一页
  autoPlay?: boolean
  showControls?: boolean
}

export default function RecentPostsCarousel({ 
  initialLetters = [], 
  cardsPerPage = 6,
  autoPlay = true,
  showControls = true
}: RecentPostsCarouselProps) {
  const [letters, setLetters] = useState<Letter[]>(initialLetters)
  const [displayIndices, setDisplayIndices] = useState<number[]>([0, 1, 2, 3, 4, 5]) // 当前显示的6个卡片的索引
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0) // 当前轮换到哪个位置
  const [animatingPositions, setAnimatingPositions] = useState<Set<number>>(new Set()) // 正在动画的位置
  const [exitingPositions, setExitingPositions] = useState<Set<number>>(new Set()) // 正在退出的位置
  const [enteringPositions, setEnteringPositions] = useState<Set<number>>(new Set()) // 正在进入的位置

  // 样例卡片数据（当没有真实数据时使用）
  const sampleCards = [
    {
      to: "Alice",
      message: "I still hear your voice in every melody that plays on the radio, and I can't help but think of all those late nights we spent talking under the stars, sharing our dreams and hopes for the future",
      song: {
        title: "Yellow",
        artist: "Coldplay",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Ben", 
      message: "The sky was pink when we last danced together in your garden, and now every sunset reminds me of that perfect moment when time seemed to stop and nothing else mattered in the world",
      song: {
        title: "Someone Like You",
        artist: "Adele",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Chris",
      message: "This tune reminds me of your warm smile and the way you always knew exactly what to say to make everything better, even on the darkest days when I felt like giving up",
      song: {
        title: "From Afar", 
        artist: "Vance Joy",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Dana",
      message: "No matter the distance music brings you back to me, and I find myself humming our favorite songs whenever I miss you the most, which is basically every single day since you moved away",
      song: {
        title: "Home",
        artist: "Edward Sharpe",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Emma",
      message: "Your laugh echoes in every harmony I hear, and I swear I can still feel the warmth of your hand in mine during those quiet moments we shared sitting by the lake watching the sun set", 
      song: {
        title: "Perfect",
        artist: "Ed Sheeran",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Frank",
      message: "Sleep tight old friend this tune is for you and all the memories we made together over the years, from our childhood adventures to our late-night conversations about life, love, and everything in between",
      song: {
        title: "Fix You",
        artist: "Coldplay", 
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    }
  ]

  // 扩展样例数据到30个卡片（6*5组）
  const extendedSampleCards = Array.from({ length: 30 }, (_, index) => {
    const baseCard = sampleCards[index % sampleCards.length]
    return {
      ...baseCard,
      to: `${baseCard.to} ${Math.floor(index / 6) + 1}`, // 添加组号
      message: `${baseCard.message} (Card ${index + 1})`
    }
  })

  // 加载所有Letters用于轮播，每小时更新一次
  useEffect(() => {
    const loadAllLetters = async () => {
      setLoading(true)
      try {
        // 从新的API接口加载Letters
        const response = await fetch('/api/home/recent-posts?limit=30&offset=0')
        if (!response.ok) {
          console.error('Frontend: API response not OK:', response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json() as Letter[]
        setLetters(data)
        console.log('Frontend: Received letters from API:', data);
      } catch (error) {
        console.error('Frontend: Failed to load letters for carousel:', error)
        setLetters([]); // 确保在失败时清空letters，触发fallback
      } finally {
        setLoading(false)
      }
    }

    loadAllLetters()
    const interval = setInterval(loadAllLetters, 60 * 60 * 1000) // 1小时
    return () => clearInterval(interval)
  }, [])

  // 如果没有真实Letters，使用扩展的样例数据
  const displayLetters = letters.length > 0 ? letters : extendedSampleCards.map((card, index) => ({
    id: `sample-${index}`,
    link_id: `sample-${index}`,
    recipient_name: card.to,
    message: card.message,
    song_title: card.song.title,
    song_artist: card.song.artist,
    song_album_cover: card.song.albumCover,
    created_at: new Date().toISOString(),
    view_count: 0,
    is_public: true
  } as Letter))

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0) // H5端当前显示的卡片索引
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // PC端手势滑动处理 (不再需要，因为我们改为原生滑动)
  const handleTouchStart = (e: React.TouchEvent) => {}
  const handleTouchMove = (e: React.TouchEvent) => {}
  const handleTouchEnd = () => {}


  // 单个卡片轮播 - 两阶段动画
  useEffect(() => {
    if (!autoPlay || displayLetters.length <= 6 || isHovered || isMobile) return

    const interval = setInterval(() => {
      const positionToUpdate = currentRotationIndex
      
      // 第一阶段：退出动画（1秒）
      setExitingPositions(prev => new Set(prev).add(positionToUpdate))
      
      setTimeout(() => {
        // 更新卡片内容
        setDisplayIndices(prev => {
          const newIndices = [...prev]
          const currentCardIndex = newIndices[positionToUpdate]
          const nextCardIndex = (currentCardIndex + 6) % displayLetters.length
          newIndices[positionToUpdate] = nextCardIndex
          return newIndices
        })
        
        // 清除退出状态，开始进入动画
        setExitingPositions(prev => {
          const newSet = new Set(prev)
          newSet.delete(positionToUpdate)
          return newSet
        })
        
        // 第二阶段：进入动画（1秒）
        setEnteringPositions(prev => new Set(prev).add(positionToUpdate))
        
        setTimeout(() => {
          // 清除进入状态
          setEnteringPositions(prev => {
            const newSet = new Set(prev)
            newSet.delete(positionToUpdate)
            return newSet
          })
        }, 1000) // 进入动画1秒
        
      }, 1000) // 退出动画1秒
      
      // 更新轮换位置
      setCurrentRotationIndex(prev => (prev + 1) % 6)
    }, 2500) // 2.5秒切换一次（1秒退出 + 1秒进入 + 0.5秒间隔）

    return () => clearInterval(interval)
  }, [displayLetters.length, autoPlay, isHovered, currentRotationIndex, isMobile]) // 增加isMobile依赖

  // Convert Letter to card format
  const convertLetterToCard = (letter: Letter) => {
    console.log('Frontend: convertLetterToCard - Input letter:', letter);
    const card = {
      to: letter.recipient_name,
      message: letter.message,
      song: {
        title: letter.song_title,
        artist: letter.song_artist,
        albumCover: letter.song_album_cover
      },
      linkId: letter.link_id
    };
    console.log('Frontend: convertLetterToCard - Output card:', card);
    return card;
  };

  // 获取当前显示的6个Letters
  const getCurrentLetters = () => {
    return displayIndices.map(index => displayLetters[index] || displayLetters[0])
  }

  const currentLetters = getCurrentLetters()

  if (loading) {
    return (
      <section className="recent-posts-carousel">
        <div className="carousel-header">
          <h2>Recent Posts</h2>
        </div>
        <div className="loading-carousel">Loading recent posts...</div>
      </section>
    )
  }

  // H5端渲染多个卡片整体滑动
  if (isMobile) {
    return (
      <section className="recent-posts-carousel mobile-carousel">
        <div className="carousel-header">
          <h2>Recent Posts</h2>
        </div>
        
        <div className="mobile-scroll-container">
          {displayLetters.map((letter, idx) => {
            const card = convertLetterToCard(letter)
            return (
              <div key={letter.id || `mobile-${idx}`} className="mobile-card-item">
                <MusicCard 
                  to={card.to}
                  message={card.message}
                  song={card.song}
                  linkId={card.linkId}
                />
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  // PC端渲染多个卡片
  return (
    <section 
      className="recent-posts-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-header">
        <h2>Recent Posts</h2>
      </div>
      
      <div className="carousel-container">
        <div className="cards cards-6">
          {currentLetters.map((letter, index) => {
            const card = convertLetterToCard(letter)
            const isExiting = exitingPositions.has(index)
            const isEntering = enteringPositions.has(index)
            
            let animationClass = ''
            if (isExiting) animationClass = 'card-exiting'
            else if (isEntering) animationClass = 'card-entering'
            
            return (
              <div 
                key={`${letter.link_id || letter.id}-${displayIndices[index]}`}
                className={`card-wrapper ${animationClass}`}
              >
                <MusicCard 
                  to={card.to}
                  message={card.message}
                  song={card.song}
                  linkId={card.linkId}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

