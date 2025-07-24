import Image from 'next/image'

interface MusicCardProps {
  to: string
  message: string
  song: {
    title: string
    artist: string
    albumCover: string
  }
}

export default function MusicCard({ to, message, song }: MusicCardProps) {
  return (
    <div className="card">
      <div className="to">To: {to}</div>
      <div className="message">{message}</div>
      <div className="song">
        <Image 
          src={song.albumCover} 
          alt={song.title}
          width={50}
          height={50}
        />
        <div className="song-details">
          <div className="title">{song.title}</div>
          <div className="artist">{song.artist}</div>
        </div>
        <div className="play-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.5c-.17 0-.33-.05-.47-.15-1.26-.77-2.85-1.19-4.47-1.19-1.28 0-2.54.28-3.65.81-.14.07-.3.1-.45.1-.47 0-.85-.38-.85-.85 0-.32.18-.6.46-.74 1.37-.65 2.89-.99 4.49-.99 1.95 0 3.82.5 5.27 1.4.28.17.46.48.46.82 0 .47-.38.79-.79.79zm1.14-2.57c-.2 0-.39-.06-.55-.18-1.58-.96-3.56-1.49-5.58-1.49-1.6 0-3.17.33-4.57.96-.17.08-.36.12-.55.12-.59 0-1.07-.48-1.07-1.07 0-.39.21-.74.55-.93 1.64-.74 3.48-1.12 5.64-1.12 2.38 0 4.68.6 6.47 1.69.34.21.55.58.55.99 0 .59-.48 1.03-1.07 1.03zm1.05-2.96c-.23 0-.46-.07-.66-.21-1.86-1.13-4.18-1.74-6.53-1.74-1.89 0-3.76.39-5.37 1.12-.2.09-.42.14-.64.14-.69 0-1.25-.56-1.25-1.25 0-.45.24-.85.62-1.07C6.27 8.2 8.59 7.75 11 7.75c2.74 0 5.35.69 7.36 1.94.38.24.64.66.64 1.14 0 .69-.56 1.25-1.25 1.25z" fill="#1DB954"/>
          </svg>
        </div>
      </div>
    </div>
  )
}