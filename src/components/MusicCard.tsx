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
          <img 
            src="https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico" 
            alt="Spotify"
            width={20}
            height={20}
          />
        </div>
      </div>
    </div>
  )
}