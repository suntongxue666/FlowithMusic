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
    // 直接使用supabase获取letter数据 - 绕过letterService的复杂逻辑
    let letter: Letter | null = null
    
    try {
      if (supabase) {
        console.log('Direct supabase fetch for metadata, linkId:', linkId)
        const { data, error } = await supabase
          .from('letters')
          .select('song_title, song_artist, song_album_cover, created_at, is_public')
          .eq('link_id', linkId)
          .single()
        
        console.log('Supabase query result:', { data, error })
        
        if (data && !error) {
          // 即使不是公开的也生成个性化标题，因为用户有直接链接
          letter = data as Letter
          console.log('Successfully fetched letter from supabase for metadata:', {
            song_title: letter?.song_title,
            song_artist: letter?.song_artist,
            is_public: letter?.is_public,
            linkId: linkId
          })
        } else if (error) {
          console.error('Supabase error for metadata:', error)
        }
      } else {
        console.error('Supabase client not available for metadata')
      }
    } catch (error) {
      console.error('Failed to fetch letter for metadata:', error)
    }
    
    if (!letter || !letter.song_title || !letter.song_artist) {
      console.log('No letter data found for metadata, using fallback. Letter data:', {
        letter: !!letter,
        song_title: letter?.song_title,
        song_artist: letter?.song_artist
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

    const songTitle = letter.song_title
    const artistName = letter.song_artist

    console.log('Generating metadata for:', { songTitle, artistName })

    // Title模板 (60字符以内)
    const title = `Send the Song: Handwritten Letter with "${songTitle}" by ${artistName} | FlowithMusic`
    
    console.log('✅ Generated personalized title:', title)
    
    // Description模板 (155字符以内) - 修改为英文
    const description = `Receive a handwritten letter paired with "${songTitle}" by ${artistName}. React with emojis, express your feelings, and find people who vibe to the same tune.`
    
    // Keywords
    const keywords = `send the song, sendthesong, send the song ${songTitle}, musical messages, handwritten letter, send a song to a friend, emotional music sharing, vibe music letter, letter with song, emoji letter reaction, react to music, music connection, free play ${artistName}'s ${songTitle} music`

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