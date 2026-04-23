'use client'

import { useState, useEffect } from 'react'
import MusicCard from './MusicCard'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

interface ArtistSection {
  artist: string
  letters: Letter[]
  count: number
}

export default function ArtistLetters() {
  const [artistSections, setArtistSections] = useState<ArtistSection[]>([])
  const [loading, setLoading] = useState(true)
  const [displayIndices, setDisplayIndices] = useState<{[key: string]: number[]}>({}) // 每个艺术家的显示索引
  const [currentRotationIndex, setCurrentRotationIndex] = useState<{[key: string]: number}>({}) // 每个艺术家的当前轮换位置
  const [exitingPositions, setExitingPositions] = useState<{[key: string]: Set<number>}>({}) // 正在退出的位置
  const [enteringPositions, setEnteringPositions] = useState<{[key: string]: Set<number>}>({}) // 正在进入的位置

  useEffect(() => {
    const loadArtistLetters = async () => {
      try {
        setLoading(true)
        
        // 从新的API接口获取热门艺术家帖子
        const response = await fetch('/api/home/posts-hot-artists?artistLimit=100&minLettersCount=6')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const hotArtistSections: ArtistSection[] = await response.json()

        setArtistSections(hotArtistSections)

        // 如果新的API没有返回任何热门艺术家，则尝试获取热门Letter作为fallback
        if (hotArtistSections.length === 0) {
          try {
            const popularLetters = await letterService.getPublicLetters(6, 0, 'view_count')
            if (popularLetters.length >= 3) {
              // 裁剪为3的倍数
              const trimmedCount = Math.floor(popularLetters.length / 3) * 3
              setArtistSections([{
                artist: 'Popular Songs',
                letters: popularLetters.slice(0, trimmedCount),
                count: popularLetters.length
              }])
            }
          } catch (error) {
            console.error('Failed to load popular letters as fallback:', error)
          }
        }

        // 初始化每个艺术家的显示索引和轮换位置
        const initialDisplayIndices: {[key: string]: number[]} = {}
        const initialRotationIndex: {[key: string]: number} = {}
        const initialExitingPositions: {[key: string]: Set<number>} = {}
        const initialEnteringPositions: {[key: string]: Set<number>} = {}

        hotArtistSections.forEach((section, sectionIndex) => {
          initialDisplayIndices[section.artist] = [0, 1, 2] // 显示前3个
          initialRotationIndex[section.artist] = sectionIndex === 0 ? 0 : 2 // 第一组从位置0开始，第二组从位置2开始
          initialExitingPositions[section.artist] = new Set()
          initialEnteringPositions[section.artist] = new Set()
        })

        setDisplayIndices(initialDisplayIndices)
        setCurrentRotationIndex(initialRotationIndex)
        setExitingPositions(initialExitingPositions)
        setEnteringPositions(initialEnteringPositions)
      } catch (error) {
        console.error('Failed to load artist letters:', error)
      } finally {
        setLoading(false)
      }
    }

    // 立即加载
    loadArtistLetters()
    
    // 每3小时更新一次数据
    const interval = setInterval(loadArtistLetters, 3 * 60 * 60 * 1000) // 3小时
    
    return () => clearInterval(interval)
  }, [])

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false)
  const [mobileCardIndices, setMobileCardIndices] = useState<{[key: string]: number}>({}) // 每个艺术家的当前卡片索引
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [currentTouchArtist, setCurrentTouchArtist] = useState<string | null>(null)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 初始化移动端卡片索引
  useEffect(() => {
    if (isMobile && artistSections.length > 0) {
      const initialIndices: {[key: string]: number} = {}
      artistSections.forEach(section => {
        initialIndices[section.artist] = 0
      })
      setMobileCardIndices(initialIndices)
    }
  }, [isMobile, artistSections])

  // H5端手势滑动处理 (不再需要，因为我们改为原生滑动)
  const handleTouchStart = (e: React.TouchEvent, artist: string) => {}
  const handleTouchMove = (e: React.TouchEvent) => {}
  const handleTouchEnd = () => {}


  // 艺术家卡片轮播逻辑
  useEffect(() => {
    if (artistSections.length === 0 || isMobile) return

    const intervals: NodeJS.Timeout[] = []

    artistSections.forEach((section, sectionIndex) => {
      if (section.letters.length <= 3) return // 如果只有3个或更少，不需要轮播

      const interval = setInterval(() => {
        const artist = section.artist
        const positionToUpdate = currentRotationIndex[artist] || 0
        
        // 第一阶段：退出动画（1秒）
        setExitingPositions(prev => ({
          ...prev,
          [artist]: new Set(prev[artist] || []).add(positionToUpdate)
        }))
        
        setTimeout(() => {
          // 更新卡片内容
          setDisplayIndices(prev => {
            const currentIndices = prev[artist] || [0, 1, 2]
            const newIndices = [...currentIndices]
            const currentCardIndex = newIndices[positionToUpdate]
            const nextCardIndex = (currentCardIndex + 3) % section.letters.length
            newIndices[positionToUpdate] = nextCardIndex
            
            return {
              ...prev,
              [artist]: newIndices
            }
          })
          
          // 清除退出状态，开始进入动画
          setExitingPositions(prev => {
            const newSet = new Set(prev[artist] || [])
            newSet.delete(positionToUpdate)
            return {
              ...prev,
              [artist]: newSet
            }
          })
          
          // 第二阶段：进入动画（1秒）
          setEnteringPositions(prev => ({
            ...prev,
            [artist]: new Set(prev[artist] || []).add(positionToUpdate)
          }))
          
          setTimeout(() => {
            // 清除进入状态
            setEnteringPositions(prev => {
              const newSet = new Set(prev[artist] || [])
              newSet.delete(positionToUpdate)
              return {
                ...prev,
                [artist]: newSet
              }
            })
          }, 1000) // 进入动画1秒
          
        }, 1000) // 退出动画1秒
        
        // 更新轮换位置
        setCurrentRotationIndex(prev => ({
          ...prev,
          [artist]: (prev[artist] + 1) % 3
        }))
      }, 2500) // 2.5秒切换一次

      intervals.push(interval)
    })

    return () => {
      intervals.forEach(interval => clearInterval(interval))
    }
  }, [artistSections, currentRotationIndex])

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

  if (loading) {
    return (
      <section className="artist-letters">
        <div className="loading-artist">Loading artist collections...</div>
      </section>
    )
  }

  if (artistSections.length === 0) {
    return null // 如果没有符合条件的艺术家，不显示这个区域
  }

  // H5端渲染多个卡片整体滑动
  if (isMobile) {
    return (
      <section className="artist-letters mobile-artist-letters">
        {artistSections.map((section, sectionIndex) => (
          <div key={section.artist} className="artist-section mobile-artist-section">
            <div className="artist-header">
              <h2>Posts with {section.artist}</h2>
            </div>
            
            <div className="mobile-scroll-container">
              {section.letters.map((letter, idx) => {
                const card = convertLetterToCard(letter)
                return (
                  <div key={letter.id || `artist-${idx}`} className="mobile-card-item">
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
        ))}
      </section>
    )
  }

  // PC端渲染
  return (
    <section className="artist-letters">
      {artistSections.map((section, sectionIndex) => (
        <div key={section.artist} className="artist-section">
          <div className="artist-header">
            <h2>Posts with {section.artist}</h2>
          </div>
          
          <div className="artist-cards">
            {(displayIndices[section.artist] || [0, 1, 2]).map((letterIndex, cardIndex) => {
              const letter = section.letters[letterIndex]
              if (!letter) return null
              
              const card = convertLetterToCard(letter)
              const isExiting = exitingPositions[section.artist]?.has(cardIndex)
              const isEntering = enteringPositions[section.artist]?.has(cardIndex)
              
              let animationClass = ''
              if (isExiting) animationClass = 'card-exiting'
              else if (isEntering) animationClass = 'card-entering'
              
              return (
                <div 
                  key={`${letter.link_id || letter.id}-${letterIndex}`}
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
      ))}
    </section>
  )
}