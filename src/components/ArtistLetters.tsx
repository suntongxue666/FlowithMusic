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
        
        // 3. 为每个艺术家获取3个最新的Letters
        const artistSections: ArtistSection[] = []
        
        for (const artistInfo of qualifiedArtists.slice(0, 3)) { // 最多显示3个艺术家
          try {
            const artistLetters = await letterService.getPublicLetters(3, 0, 'created_at', {
              artist: artistInfo.artist
            })
            
            if (artistLetters.length > 0) {
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
        
      } catch (error) {
        console.error('Failed to load artist letters:', error)
      } finally {
        setLoading(false)
      }
    }

    loadArtistLetters()
  }, [])

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
            <h2>Letters about {section.artist}</h2>
            <span className="artist-count">({section.count} letters)</span>
          </div>
          
          <div className="artist-cards">
            {section.letters.map((letter, index) => {
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
    </section>
  )
}