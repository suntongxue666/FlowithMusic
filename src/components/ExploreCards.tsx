'use client'

import { useState, useEffect, useCallback } from 'react'
import MusicCard from './MusicCard'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'

interface ExploreCardsProps {
  searchQuery?: string
}

export default function ExploreCards({ searchQuery }: ExploreCardsProps) {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  
  const LETTERS_PER_PAGE = 18 // 6 columns * 3 rows

  const loadLetters = useCallback(async (pageNum: number, isNewSearch = false) => {
    try {
      if (isNewSearch) {
        setLoading(true)
        setLetters([])
        setPage(0)
        setHasMore(true)
        pageNum = 0
      } else {
        setLoadingMore(true)
      }

      const offset = pageNum * LETTERS_PER_PAGE
      let fetchedLetters: Letter[] = []

      if (searchQuery && searchQuery.trim()) {
        // 搜索模式：按收件人、歌曲、艺术家搜索
        const query = searchQuery.trim().toLowerCase()
        const allLetters = await letterService.getPublicLetters(1000, 0, 'created_at')
        
        fetchedLetters = allLetters.filter(letter => {
          const recipientMatch = letter.recipient_name.toLowerCase().includes(query)
          const songMatch = letter.song_title.toLowerCase().includes(query)
          const artistMatch = letter.song_artist.toLowerCase().includes(query)
          
          return (recipientMatch || songMatch || artistMatch)
        }).slice(offset, offset + LETTERS_PER_PAGE)
      } else {
        // 普通模式：获取所有公开Letters
        fetchedLetters = await letterService.getPublicLetters(LETTERS_PER_PAGE, offset, 'created_at')
      }

      // 如果没有足够的Letters，尝试从localStorage获取
      if (fetchedLetters.length === 0 && pageNum === 0) {
        console.log('📝 Explore: 数据库无Letters，检查localStorage和认证状态...')
        
        // 检查是否有认证错误
        const hasAuthError = localStorage.getItem('supabase_auth_error')
        if (hasAuthError) {
          console.log('📝 Explore: 检测到认证错误，使用localStorage作为主要数据源')
        }
        
        if (typeof window !== 'undefined') {
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const validLocalLetters = localLetters
            .filter((letter: Letter) => {
              if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase()
                const recipientMatch = letter.recipient_name.toLowerCase().includes(query)
                const songMatch = letter.song_title.toLowerCase().includes(query)
                const artistMatch = letter.song_artist.toLowerCase().includes(query)
                return (recipientMatch || songMatch || artistMatch)
              }
              return true
            })
            .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          
          fetchedLetters = validLocalLetters.slice(offset, offset + LETTERS_PER_PAGE)
        }
      }

      if (isNewSearch) {
        setLetters(fetchedLetters)
      } else {
        setLetters(prev => [...prev, ...fetchedLetters])
      }

      setHasMore(fetchedLetters.length === LETTERS_PER_PAGE)
      setPage(pageNum)
      
    } catch (error) {
      console.error('Failed to load letters:', error)
      
      // 错误处理：尝试从localStorage加载
      if (typeof window !== 'undefined') {
        try {
          const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
          const validLocalLetters = localLetters
            .filter((letter: Letter) => {
              if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase()
                const recipientMatch = letter.recipient_name.toLowerCase().includes(query)
                const songMatch = letter.song_title.toLowerCase().includes(query)
                const artistMatch = letter.song_artist.toLowerCase().includes(query)
                return (recipientMatch || songMatch || artistMatch)
              }
              return true
            })
            .sort((a: Letter, b: Letter) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          
          const offset = page * LETTERS_PER_PAGE
          const paginatedLetters = validLocalLetters.slice(offset, offset + LETTERS_PER_PAGE)
          
          if (isNewSearch) {
            setLetters(paginatedLetters)
          } else {
            setLetters(prev => [...prev, ...paginatedLetters])
          }
          
          setHasMore(paginatedLetters.length === LETTERS_PER_PAGE)
        } catch (localError) {
          console.error('Local storage also failed:', localError)
          setLetters([])
          setHasMore(false)
        }
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchQuery])

  // 初始加载
  useEffect(() => {
    loadLetters(0, true)
  }, [loadLetters])

  // 加载更多
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadLetters(page + 1)
    }
  }

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

  if (loading) {
    return (
      <section className="explore-cards">
        <div className="loading-cards">Loading letters...</div>
      </section>
    )
  }

  if (letters.length === 0) {
    return (
      <section className="explore-cards">
        <div className="no-letters">
          {searchQuery ? 'No letters found matching your search.' : 'No letters available yet.'}
        </div>
      </section>
    )
  }

  return (
    <section className="explore-cards">
      <div className="cards">
        {letters.map((letter, index) => {
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
      
      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading more letters...' : 'Load More'}
          </button>
        </div>
      )}
    </section>
  )
}