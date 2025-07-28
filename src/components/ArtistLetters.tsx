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
        
        // 1. 获取热门艺术家（Letter数量≥6的）
        const popularArtists = await letterService.getPopularArtists(20)
        console.log('📝 热门艺术家:', popularArtists)
        
        // 2. 筛选出Letter数量≥6的艺术家
        const qualifiedArtists = popularArtists.filter(artist => artist.count >= 6)
        console.log('📝 符合条件的艺术家:', qualifiedArtists)
        
        // 3. 为每个艺术家获取更多Letters用于轮播
        const artistSections: ArtistSection[] = []
        
        for (const artistInfo of qualifiedArtists.slice(0, 2)) { // 最多显示2个艺术家
          try {
            // 获取该艺术家的更多Letters（取3的倍数，最多12个）
            const maxLetters = Math.min(12, Math.floor(artistInfo.count / 3) * 3)
            const artistLetters = await letterService.getPublicLetters(maxLetters, 0, 'created_at', {
              artist: artistInfo.artist
            })
            
            if (artistLetters.length >= 3) { // 至少要有3个才显示
              artistSections.push({
                artist: artistInfo.artist,
                letters: artistLetters,
                count: artistInfo.count
              })
            }
          } catch (error) {
            console.error(`Failed to load letters for ${artistInfo.artist}:`, error)
          }
        }
        
        setArtistSections(artistSections)
        console.log('📝 艺术家分组结果:', artistSections)
        
        // 初始化每个艺术家的显示索引和轮换位置
        const initialDisplayIndices: {[key: string]: number[]} = {}
        const initialRotationIndex: {[key: string]: number} = {}
        const initialExitingPositions: {[key: string]: Set<number>} = {}
        const initialEnteringPositions: {[key: string]: Set<number>} = {}
        
        artistSections.forEach((section, sectionIndex) => {
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
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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