'use client'

import Link from 'next/link'

interface MusicCardProps {
    to: string
    message: string
    song: {
        title: string
        artist: string
        albumCover: string
    }
    linkId: string
}

export default function MusicCard({ to, message, song, linkId }: MusicCardProps) {
    return (
        <Link href={`/letter/${linkId}`} className="card-link">
            <div className="card">
                <div className="to">To: {to}</div>
                <div className="message">{message}</div>
                <div className="song">
                    <img
                        src={song.albumCover}
                        alt={song.title}
                        width={50}
                        height={50}
                    />
                    <div className="song-details">
                        <div className="title">{song.title}</div>
                        <div className="artist">{song.artist}</div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
