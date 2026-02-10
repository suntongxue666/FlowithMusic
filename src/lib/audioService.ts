export async function checkIsChinaIP(): Promise<boolean> {
    try {
        // 使用 ipapi.co (免费且无需 key，但在高并发下可能受限，生产环境建议换用自有 API 或 Edge Middleware)
        const response = await fetch('https://ipapi.co/json/')
        if (!response.ok) {
            throw new Error('IP detection failed')
        }
        const data = await response.json()
        return data.country_code === 'CN'
    } catch (error) {
        console.warn('IP detection failed, defaulting to false:', error)
        return false
    }
}

export interface AppleMusicTrack {
    trackName: string
    artistName: string
    previewUrl: string
    artworkUrl100: string
    trackViewUrl: string
}

export async function searchAppleMusic(songTitle: string, artistName: string): Promise<AppleMusicTrack | null> {
    try {
        const term = encodeURIComponent(`${songTitle} ${artistName}`)
        const response = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`)

        if (!response.ok) return null

        const data = await response.json()
        if (data.resultCount === 0) return null

        const track = data.results[0]

        // 简单的校验，确保不是完全不相关的歌曲
        // 但 iTunes Search 通常第一条就是最匹配的
        return {
            trackName: track.trackName,
            artistName: track.artistName,
            previewUrl: track.previewUrl,
            artworkUrl100: track.artworkUrl100,
            trackViewUrl: track.trackViewUrl
        }
    } catch (error) {
        console.error('Apple Music search failed:', error)
        return null
    }
}
