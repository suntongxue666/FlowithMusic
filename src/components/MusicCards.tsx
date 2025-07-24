'use client'

import { useState, useEffect } from 'react'
import MusicCard from './MusicCard'
import { letterStorage, MusicLetter } from '@/lib/letterStorage'

export default function MusicCards() {
  const [letters, setLetters] = useState<MusicLetter[]>([])
  
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
    // Load user letters from localStorage
    const userLetters = letterStorage.getRecentLetters(6)
    setLetters(userLetters)
  }, [])

  // Convert MusicLetter to the format expected by MusicCard
  const convertLetterToCard = (letter: MusicLetter) => ({
    to: letter.to,
    message: letter.message,
    song: {
      title: letter.song.title,
      artist: letter.song.artist,
      albumCover: letter.song.albumCover
    }
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

  return (
    <section className="cards">
      {cardsToShow.map((card, index) => (
        <MusicCard 
          key={index}
          to={card.to}
          message={card.message}
          song={card.song}
        />
      ))}
    </section>
  )
}