import { useRouter } from 'next/navigation'

interface MusicCardProps {
    to: string
    message: string
    song: {
        title: string
        artist: string
        albumCover: string
    }
    linkId: string
    user?: {
        id?: string
        display_name?: string
        avatar_url?: string
    }
    createdAt?: string
    isPublic?: boolean
}

// 格式化为北京时间 yyyy/mm/dd hh:mm
function formatBeijingTime(isoString: string): string {
    try {
        const date = new Date(isoString)
        // 北京时间 = UTC+8
        const bjDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
        const y = bjDate.getUTCFullYear()
        const mo = String(bjDate.getUTCMonth() + 1).padStart(2, '0')
        const d = String(bjDate.getUTCDate()).padStart(2, '0')
        const h = String(bjDate.getUTCHours()).padStart(2, '0')
        const m = String(bjDate.getUTCMinutes()).padStart(2, '0')
        return `${y}/${mo}/${d} ${h}:${m}`
    } catch {
        return ''
    }
}

// 截取名字第一个词（first name）
function getFirstName(name?: string): string {
    if (!name) return 'Anonymous'
    return name.trim().split(/\s+/)[0]
}

export default function MusicCard({ to, message, song, linkId, user, createdAt, isPublic }: MusicCardProps) {
    const router = useRouter()

    const handleCardClick = () => {
        router.push(`/letter/${linkId}`)
    }

    const handleUserClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (user?.id) {
            router.push(`/user/${user.id}`)
        }
    }

    return (
        <div onClick={handleCardClick} className="card-link" style={{ cursor: 'pointer', textDecoration: 'none' }}>
            <div className="card">
                <div className="to" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="truncate">To: {to}</span>
                    {isPublic === false && (
                        <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px', 
                            backgroundColor: '#000', 
                            color: '#fff', 
                            fontSize: '10px', 
                            borderRadius: '4px', 
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                        }}>
                            Private
                        </span>
                    )}
                </div>

                {/* 作者 + 时间行 */}
                {(user || createdAt) && (
                    <div className="card-meta" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 0 6px', // 恢复间距
                        fontSize: '11px',
                        color: '#888',
                        borderBottom: '1px solid #f0f0f0', // 恢复浅灰色线
                        marginBottom: '4px', // 恢复间距
                    }}>
                        <div 
                            onClick={handleUserClick}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.display_name || 'User'}
                                    width={16}
                                    height={16}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: '#e0e0e0', display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: '9px', color: '#999', flexShrink: 0
                                }}>
                                    {getFirstName(user?.display_name)[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <span style={{ fontWeight: 500, color: '#666' }} className="hover:underline">
                                {getFirstName(user?.display_name)}
                            </span>
                        </div>
                        {createdAt && (
                            <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                {formatBeijingTime(createdAt)}
                            </span>
                        )}
                    </div>
                )}

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
        </div>
    )
}
