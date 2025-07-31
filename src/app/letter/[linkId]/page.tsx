import { Metadata } from 'next'
import { letterService } from '@/lib/letterService'
import { supabase } from '@/lib/supabase'
import type { Letter } from '@/lib/supabase'
import LetterPageClient from './LetterPageClient'

interface Props {
  params: Promise<{ linkId: string }>
}

// 生成动态SEO元数据
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { linkId } = await params
  
  try {
    // 尝试获取letter数据 - 直接使用API更可靠
    let letter: Letter | null = null
    
    try {
      // 先尝试letterService
      letter = await letterService.getLetterByLinkId(linkId)
      
      // 如果letterService失败，直接从supabase获取
      if (!letter && supabase) {
        console.log('Trying direct supabase fetch for metadata...')
        const { data, error } = await supabase
          .from('letters')
          .select('*')
          .eq('link_id', linkId)
          .single()
        
        if (data && !error) {
          letter = data
          console.log('Successfully fetched letter from supabase for metadata:', letter?.song_title)
        } else if (error) {
          console.error('Supabase error for metadata:', error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch letter for metadata:', error)
    }
    
    if (!letter || !letter.song_title || !letter.song_artist) {
      console.log('No letter data found for metadata, using fallback')
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

    const songTitle = letter.song_title
    const artistName = letter.song_artist

    console.log('Generating metadata for:', { songTitle, artistName })

    // Title模板 (60字符以内)
    const title = `Send the Song: Letter with "${songTitle}" by ${artistName} | FlowithMusic`
    
    // Description模板 (155字符以内) - 修改为英文
    const description = `Receive a handwritten letter paired with "${songTitle}" by ${artistName}. Listen to ${songTitle} by ${artistName} for free. React with emojis and connect with friends who share your musical vibe.`
    
    // Keywords
    const keywords = `send the song, sendthesong, send the song ${songTitle}, musical messages, handwritten letter, send a song to a friend, emotional music sharing, vibe music letter, letter with song, emoji letter reaction, react to music, music connection, ${artistName}, ${songTitle}, listen to ${songTitle} free, ${artistName} songs`

    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://www.flowithmusic.com/letter/${linkId}`,
        images: [
          {
            url: letter.song_album_cover || '/og-image.jpg',
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [letter.song_album_cover || '/og-image.jpg'],
      },
      alternates: {
        canonical: `https://www.flowithmusic.com/letter/${linkId}`,
      },
      other: {
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
          "image": letter.song_album_cover,
          "url": `https://www.flowithmusic.com/letter/${linkId}`,
          "dateCreated": letter.created_at,
          "genre": "Musical Message",
          "associatedMedia": {
            "@type": "MusicRecording",
            "name": letter.song_title,
            "byArtist": {
              "@type": "MusicGroup",
              "name": letter.song_artist
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
  
  return <LetterPageClient linkId={linkId} />
}