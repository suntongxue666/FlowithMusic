'use client'

import { useState, useEffect } from 'react'
import MusicCard from './MusicCard'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

export default function MusicCards() {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  
  // Sample cards for fallback when no user data exists
  const sampleCards = [
    {
      to: "Alice",
      message: "I still hear your voice\nin every melody that plays on the radio, and I can't help but think of all those late nights we spent talking under the stars, sharing our dreams and hopes for the future",
      song: {
        title: "Yellow",
        artist: "Coldplay",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Ben", 
      message: "The sky was pink\nwhen we last danced together in your garden, and now every sunset reminds me of that perfect moment when time seemed to stop and nothing else mattered in the world",
      song: {
        title: "Someone Like You",
        artist: "Adele",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Chris",
      message: "This tune reminds me\nof your warm smile and the way you always knew exactly what to say to make everything better, even on the darkest days when I felt like giving up",
      song: {
        title: "From Afar", 
        artist: "Vance Joy",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Dana",
      message: "No matter the distance\nmusic brings you back to me, and I find myself humming our favorite songs whenever I miss you the most, which is basically every single day since you moved away",
      song: {
        title: "Home",
        artist: "Edward Sharpe",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Emma",
      message: "Your laugh echoes\nin every harmony I hear, and I swear I can still feel the warmth of your hand in mine during those quiet moments we shared sitting by the lake watching the sun set", 
      song: {
        title: "Perfect",
        artist: "Ed Sheeran",
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    },
    {
      to: "Frank",
      message: "Sleep tight old friend\nthis tune is for you and all the memories we made together over the years, from our childhood adventures to our late-night conversations about life, love, and everything in between",
      song: {
        title: "Fix You",
        artist: "Coldplay", 
        albumCover: "https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5"
      }
    }
  ]

  useEffect(() => {
    const loadPublicLetters = async () => {
      try {
        setLoading(true)
        console.log('📝 开始获取公开Letters...')
        
        // 获取公开的Letters，按时间排序
        const publicLetters = await letterService.getPublicLetters(20, 0, 'created_at')
        console.log('📝 获取到的公开Letters:', publicLetters.length)
        
        // 如果数据库返回空结果且检测到认证错误，尝试从localStorage获取
        if (publicLetters.length === 0 && localStorage.getItem('supabase_auth_error')) {
          console.log('📝 检测到认证错误且无公开Letters，从localStorage获取用户Letters作为fallback...')
          
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const validLocalLetters = localLetters
            .filter((letter: Letter) => {
              const wordCount = letter.message.trim().split(/\s+/).length
              return wordCount >= 12
            })
            .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6)
          
          console.log('📝 从localStorage获取的Letters作为Home展示:', validLocalLetters.length)
          setLetters(validLocalLetters)
          return
        }
        
        // 即使有公开Letters，也检查localStorage中是否有更新的Letters需要补充显示
        if (localStorage.getItem('supabase_auth_error')) {
          console.log('📝 检测到认证错误，合并localStorage数据以显示所有Letters')
          
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const validLocalLetters = localLetters
            .filter((letter: Letter) => {
              const wordCount = letter.message.trim().split(/\s+/).length
              console.log(`📝 检查Letter ${letter.link_id}: 字数=${wordCount}, 符合条件=${wordCount >= 12}`)
              return wordCount >= 12 // 移除时间限制，只要超过12个单词就显示
            })
          
          if (validLocalLetters.length > 0) {
            console.log('📝 发现符合条件的本地Letters，优先显示:', validLocalLetters.length)
            // 合并本地letters和数据库letters，去重
            const combinedLetters = [...validLocalLetters, ...publicLetters]
            const uniqueLetters = combinedLetters.filter((letter, index, self) => 
              index === self.findIndex(l => l.link_id === letter.link_id)
            )
            const sortedCombined = uniqueLetters
              .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 6)
            
            setLetters(sortedCombined)
            return
          }
        }
        
        // 过滤出消息超过12个单词的Letters，并显示调试信息
        const filteredLetters = publicLetters.filter(letter => {
          const wordCount = letter.message.trim().split(/\s+/).length
          console.log(`📝 Letter "${letter.recipient_name}": ${wordCount} words - ${wordCount >= 12 ? '✅ 符合' : '❌ 不符合'}`)
          return wordCount >= 12
        })
        
        console.log('📝 过滤后的Letters:', filteredLetters.length)
        
        if (filteredLetters.length > 0) {
          setLetters(filteredLetters.slice(0, 6)) // 只取前6个
        } else {
          // 如果没有公开Letters，检查localStorage中的Letters
          console.log('📝 没有公开Letters，检查本地存储...')
          
          if (typeof window !== 'undefined') {
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            const validLocalLetters = localLetters
              .filter((letter: Letter) => {
                const wordCount = letter.message.trim().split(/\s+/).length
                return wordCount >= 12
              })
              .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 6)
            
            console.log('📝 本地有效Letters:', validLocalLetters.length)
            
            if (validLocalLetters.length > 0) {
              setLetters(validLocalLetters)
            } else {
              console.log('📝 使用样例卡片')
              setLetters([]) // 显示样例卡片
            }
          } else {
            setLetters([]) // 显示样例卡片
          }
        }
      } catch (error) {
        console.error('Failed to load public letters:', error)
        
        // 数据库失败时，尝试显示localStorage中的Letters
        console.log('📝 数据库失败，尝试本地存储...')
        if (typeof window !== 'undefined') {
          try {
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            const validLocalLetters = localLetters
              .filter((letter: Letter) => {
                const wordCount = letter.message.trim().split(/\s+/).length
                return wordCount >= 12
              })
              .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 6)
            
            console.log('📝 错误恢复：本地Letters:', validLocalLetters.length)
            setLetters(validLocalLetters)
          } catch (localError) {
            console.error('本地存储也失败:', localError)
            setLetters([]) // 显示样例卡片
          }
        } else {
          setLetters([]) // 显示样例卡片
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadPublicLetters()
  }, [])

  // Convert Letter to the format expected by MusicCard
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

  // Use user letters if available, otherwise fall back to sample cards
  const displayCards = letters.length > 0 
    ? letters.map(convertLetterToCard)
    : sampleCards

  // Ensure we have exactly 6 cards
  const cardsToShow = displayCards.slice(0, 6)
  
  // If we have fewer than 6 user letters, fill with sample cards
  if (cardsToShow.length < 6) {
    const remainingSlots = 6 - cardsToShow.length
    const samplesToAdd = sampleCards.slice(0, remainingSlots)
    cardsToShow.push(...samplesToAdd)
  }

  if (loading) {
    return (
      <section className="cards">
        <div className="loading-cards">Loading recent letters...</div>
      </section>
    )
  }

  return (
    <section className="cards">
      {cardsToShow.map((card, index) => (
        <MusicCard 
          key={(card as any).linkId || index}
          to={card.to}
          message={card.message}
          song={card.song}
          linkId={(card as any).linkId}
        />
      ))}
    </section>
  )
}