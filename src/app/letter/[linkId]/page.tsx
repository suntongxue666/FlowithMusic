import { Metadata } from 'next'
import { letterService } from '@/lib/letterService'
import { supabase, cachedSupabase } from '@/lib/supabase'
import type { Letter } from '@/lib/supabase'
import { Suspense } from 'react'
import LetterPageClient from './LetterPageClient'

interface Props {
  params: Promise<{ linkId: string }>
}

// 生成动态SEO元数据
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { linkId } = await params

  console.log('=== 元数据生成开始 (使用缓存代理) ===', new Date().toISOString())

  try {
    // 🔴 使用 1. cachedSupabase 获取数据 - 享受 Cloudflare 缓存保护
    let letter: Letter | null = null

    try {
      if (cachedSupabase) {
        console.log('Proxy fetch for metadata, linkId:', linkId)
        const { data, error } = await cachedSupabase
          .from('letters')
          .select('song_title, song_artist, song_album_cover, created_at, is_public, message, category')
          .eq('link_id', linkId)
          .single()
        
        if (data && !error) {
          letter = data as Letter
        }
      }
      
      // 🔵 降级方案：2. 如果缓存没拿到，直连数据库
      if (!letter && supabase) {
        console.log('Fallback to direct DB for metadata, linkId:', linkId)
        const { data, error } = await supabase
          .from('letters')
          .select('song_title, song_artist, song_album_cover, created_at, is_public, message, category')
          .eq('link_id', linkId)
          .single()
        
        if (data && !error) {
          letter = data as Letter
        }
      }
    } catch (error) {
      console.error('Failed to fetch letter for metadata:', error)
    }

    // 更严格的条件检查，确保字段不为空字符串
    const hasValidSongData = letter &&
      letter.song_title &&
      letter.song_artist &&
      letter.song_title.trim() !== '' &&
      letter.song_artist.trim() !== ''

    if (!hasValidSongData) {
      console.log('No valid letter data found for metadata, using fallback. Letter data:', {
        letter: !!letter,
        song_title: letter?.song_title,
        song_artist: letter?.song_artist,
        song_title_length: letter?.song_title?.length,
        song_artist_length: letter?.song_artist?.length
      })
      return {
        title: 'Personal Music Letter | FlowithMusic',
        description: 'Discover a handwritten letter paired with music. React with emojis, express your feelings, and connect with friends who share your musical vibe.',
        keywords: 'send the song, musical messages, handwritten letter, music sharing, emoji reactions',
        openGraph: {
          title: 'Personal Music Letter | FlowithMusic',
          description: 'Discover a handwritten letter paired with music. React with emojis and connect with friends.',
          type: 'website',
          url: `https://www.flowithmusic.com/letter/${linkId}`,
          images: ['/og-image.jpg'],
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Personal Music Letter | FlowithMusic',
          description: 'Discover a handwritten letter paired with music. React with emojis and connect with friends.',
          images: ['/og-image.jpg'],
        },
        alternates: {
          canonical: `https://www.flowithmusic.com/letter/${linkId}`,
        },
      }
    }

    const songTitle = letter!.song_title
    const artistName = letter!.song_artist
    const message = letter!.message || ""

    // 单词统计逻辑
    const words = message.trim().split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length

    console.log('Generating metadata for:', { songTitle, artistName, wordCount })

    // SEO 策略
    let title = ""
    let description = ""
    let robots = {}

    if (wordCount < 120) {
      // 策略 1: < 120 单词，简化 SEO，包含 linkId 便于 GA 追踪
      title = `Musical Letter-${linkId}-${songTitle} | FlowithMusic`
      description = `Discover a handwritten letter paired with "${songTitle}" by ${artistName}.`
      if (wordCount <= 30) {
        robots = { index: false, follow: true }
      }
    } else {
      // 策略 2: >= 120 单词，完整 SEO
      title = `Send the Song: Letter -${linkId}- "${songTitle}" by ${artistName} | FlowithMusic`
      description = `Receive a heartfelt handwritten letter paired with "${songTitle}" by ${artistName}. React with emojis and connect with music.`
    }

    // Keywords
    const keywords = `send the song, sendthesong, send the song ${songTitle}, musical messages, handwritten letter, letter with song, ${artistName} ${songTitle}`

    return {
      title,
      description,
      keywords,
      robots,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://www.flowithmusic.com/letter/${linkId}`,
        images: [
          {
            url: letter!.song_album_cover || '/og-image.jpg',
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [letter!.song_album_cover || '/og-image.jpg'],
      },
      alternates: {
        canonical: `https://www.flowithmusic.com/letter/${linkId}`,
      },
      other: {
        // 缓存控制
        'cache-control': 'no-cache, no-store, must-revalidate',
        // Schema.org structured data
        'application/ld+json': JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          "name": title,
          "description": description,
          "author": {
            "@type": "Organization",
            "name": "FlowithMusic"
          },
          "image": letter!.song_album_cover,
          "url": `https://www.flowithmusic.com/letter/${linkId}`,
          "dateCreated": letter!.created_at,
          "genre": "Musical Message",
          "associatedMedia": {
            "@type": "MusicRecording",
            "name": letter!.song_title,
            "byArtist": {
              "@type": "MusicGroup",
              "name": letter!.song_artist
            }
          }
        })
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Personal Music Letter | FlowithMusic',
      description: 'Discover a handwritten letter paired with music.',
    }
  }
}

export default async function LetterPage({ params }: Props) {
  const { linkId } = await params

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <LetterPageClient linkId={linkId} />
    </Suspense>
  )
}