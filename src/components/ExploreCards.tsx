'use client'

import { useState, useEffect, useCallback } from 'react'
import MusicCard from './MusicCard'
import { letterService } from '@/lib/letterService'
import { Letter } from '@/lib/supabase'
import { useRef } from 'react'

interface ExploreCardsProps {
  searchQuery?: string
}

export default function ExploreCards({ searchQuery = '' }: ExploreCardsProps) {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  
  const LETTERS_PER_PAGE = 15 // 3列 * 5排

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

      const offset = pageNum * LETTERS_PER_PAGE;
      let url = `/api/explore?limit=${LETTERS_PER_PAGE}&offset=${offset}&format=camelCase`;

      if (searchQuery && searchQuery.trim()) {
        url += `&searchQuery=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      const fetchedLetters: Letter[] = Array.isArray(json)
        ? json
        : (json.items || []);

      if (isNewSearch) {
        setLetters(fetchedLetters);
      } else {
        setLetters(prev => [...prev, ...fetchedLetters]);
      }

      const nextHasMore = Array.isArray(json)
        ? (fetchedLetters.length === LETTERS_PER_PAGE)
        : !!json.hasMore;
      setHasMore(nextHasMore);
      setPage(pageNum);
      
    } catch (error) {
      console.error('Failed to load letters:', error)
      setLetters([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchQuery, page])

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 首次加载或搜索查询变化时触发
    loadLetters(0, true); 
  }, [searchQuery]); // 依赖searchQuery，当searchQuery变化时重新加载

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadLetters(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loading, page, loadLetters]);

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

  if (loading && letters.length === 0) {
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
      
      {loadingMore && (
        <div className="load-more-container">
          <p>Loading more letters...</p>
        </div>
      )}

      {/* 用于无限滚动的观察目标元素 */}
      <div ref={observerTarget} style={{ height: '1px', margin: '10px 0' }} />
    </section>
  )
}