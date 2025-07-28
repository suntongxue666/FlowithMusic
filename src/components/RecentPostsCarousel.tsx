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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 加载更多Letters用于轮播
  useEffect(() => {
    const loadMoreLetters = async () => {
      if (initialLetters.length > 0) return // 如果有初始数据，不重复加载
      
      setLoading(true)
      try {
        const publicLetters = await letterService.getPublicLetters(18, 0, 'created_at') // 加载18个用于轮播
        const filteredLetters = publicLetters.filter(letter => {
          const wordCount = letter.message.trim().split(/\s+/).length
          return wordCount >= 6 // 降低要求到6个单词
        })
        setLetters(filteredLetters)
      } catch (error) {
        console.error('Failed to load letters for carousel:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMoreLetters()
  }, [initialLetters])

  // 自动轮播 - 鼠标悬停时暂停
  useEffect(() => {
    if (!autoPlay || letters.length <= cardsPerPage || isHovered) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const maxIndex = Math.ceil(letters.length / cardsPerPage) - 1
        return prev >= maxIndex ? 0 : prev + 1
      })
    }, 5000) // 5秒切换一次

    return () => clearInterval(interval)
  }, [letters.length, cardsPerPage, autoPlay, isHovered])

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

  // 获取当前显示的Letters
  const getCurrentLetters = () => {
    const startIndex = currentIndex * cardsPerPage
    return letters.slice(startIndex, startIndex + cardsPerPage)
  }

  const currentLetters = getCurrentLetters()
  const totalPages = Math.ceil(letters.length / cardsPerPage)

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
        {showControls && totalPages > 1 && (
          <div className="carousel-controls">
            <button 
              onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : totalPages - 1)}
              className="carousel-btn"
              aria-label="Previous"
            >
              ←
            </button>
            <span className="carousel-indicator">
              {currentIndex + 1} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentIndex(prev => prev < totalPages - 1 ? prev + 1 : 0)}
              className="carousel-btn"
              aria-label="Next"
            >
              →
            </button>
          </div>
        )}
      </div>
      
      <div className="carousel-container">
        <div 
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.5s ease-in-out'
          }}
        >
          {Array.from({ length: totalPages }).map((_, pageIndex) => (
            <div key={pageIndex} className="carousel-page">
              <div className={`cards cards-${cardsPerPage}`}>
                {letters.slice(pageIndex * cardsPerPage, (pageIndex + 1) * cardsPerPage).map((letter, index) => {
                  const card = convertLetterToCard(letter)
                  return (
                    <MusicCard 
                      key={letter.link_id || `${letter.id}-${index}`}
                      to={card.to}
                      message={card.message}
                      song={card.song}
                      linkId={card.linkId}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 指示器点 */}
      {showControls && totalPages > 1 && (
        <div className="carousel-dots">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}