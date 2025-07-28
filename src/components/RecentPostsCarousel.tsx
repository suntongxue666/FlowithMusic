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
        // 加载更多Letters用于轮播（比如30个）
        const publicLetters = await letterService.getPublicLetters(30, 0, 'created_at')
        const filteredLetters = publicLetters.filter(letter => {
          const wordCount = letter.message.trim().split(/\s+/).length
          return wordCount >= 6
        })
        setLetters(filteredLetters)
        console.log('📝 轮播加载Letters:', filteredLetters.length)
      } catch (error) {
        console.error('Failed to load letters for carousel:', error)
      } finally {
        setLoading(false)
      }
    }

    // 立即加载
    loadAllLetters()
    
    // 每小时更新一次数据
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

  // 单个卡片轮播 - 每0.5秒替换1个卡片
  useEffect(() => {
    if (!autoPlay || displayLetters.length <= 6 || isHovered) return

    const interval = setInterval(() => {
      const positionToUpdate = currentRotationIndex
      
      // 标记当前位置开始动画
      setAnimatingPositions(prev => new Set(prev).add(positionToUpdate))
      
      // 延迟更新卡片内容，让退出动画先播放
      setTimeout(() => {
        setDisplayIndices(prev => {
          const newIndices = [...prev]
          
          // 计算下一个要显示的卡片索引
          const currentCardIndex = newIndices[positionToUpdate]
          const nextCardIndex = (currentCardIndex + 6) % displayLetters.length
          
          newIndices[positionToUpdate] = nextCardIndex
          return newIndices
        })
        
        // 动画完成后移除动画标记
        setTimeout(() => {
          setAnimatingPositions(prev => {
            const newSet = new Set(prev)
            newSet.delete(positionToUpdate)
            return newSet
          })
        }, 250) // 进入动画时长的一半
        
      }, 250) // 退出动画时长的一半
      
      // 更新轮换位置
      setCurrentRotationIndex(prev => (prev + 1) % 6)
    }, 500) // 0.5秒切换一次

    return () => clearInterval(interval)
  }, [displayLetters.length, autoPlay, isHovered, currentRotationIndex])

  // Convert Letter to card format
  const convertLetterToCard = (letter: Letter) => ({
    to: letter.recipient_name,
    message: letter.message,
    song: {
      title: letter.song_title,
      artist: letter.song_artist,
      albumCover: letter.song_album_cover
    },
    linkId: letter.link_id
  })

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

  return (
    <section 
      className="recent-posts-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-header">
        <h2>Recent Posts</h2>
        {displayLetters.length > 6 && (
          <div className="carousel-info">
            <span className="carousel-status">
              {displayLetters.length} letters • Auto-rotating every 0.5s • Next: Position {currentRotationIndex + 1}/6
              {isHovered && ' (Paused)'}
            </span>
          </div>
        )}
      </div>
      
      <div className="carousel-container">
        <div className="cards cards-6">
          {currentLetters.map((letter, index) => {
            const card = convertLetterToCard(letter)
            const isAnimating = animatingPositions.has(index)
            const isCurrentPosition = index === currentRotationIndex
            
            return (
              <div 
                key={`${letter.link_id || letter.id}-${displayIndices[index]}`}
                className={`card-wrapper ${isAnimating ? 'card-animating' : ''} ${isCurrentPosition ? 'card-current' : ''}`}
                style={{
                  transition: 'all 0.5s ease-in-out',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <MusicCard 
                  to={card.to}
                  message={card.message}
                  song={card.song}
                  linkId={card.linkId}
                />
                
                {/* 位置指示器 */}
                <div className="carousel-position-indicator">
                  {index + 1}/6
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 轮播状态指示 */}
      {displayLetters.length > 6 && (
        <div className="carousel-progress">
          <div className="progress-text">
            Showing {displayLetters.length} letters in rotation
          </div>
        </div>
      )}
    </section>
  )
}