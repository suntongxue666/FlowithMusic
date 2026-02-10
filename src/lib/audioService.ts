export async function checkIsChinaIP(): Promise<boolean> {
    try {
        // Signal 1: Check Browser Timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (timezone === 'Asia/Shanghai' || timezone === 'Asia/Urumqi') return true

        // Signal 2: Check Browser Language
        if (typeof window !== 'undefined' && window.navigator.languages.some(lang => lang.includes('zh-CN'))) {
            return true
        }

        // Signal 3: IP detection (Optional, may be slow)
        const response = await fetch('https://ipapi.co/json/', { next: { revalidate: 3600 } })
        if (response.ok) {
            const data = await response.json()
            return data.country_code === 'CN'
        }

        return false
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
    trackTimeMillis: number
}

export async function searchAppleMusic(
    songTitle: string,
    artistName: string,
    targetDurationMs?: number
): Promise<AppleMusicTrack | null> {
    try {
        const term = encodeURIComponent(`${songTitle} ${artistName}`)
        const response = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5`)

        if (!response.ok) return null

        const data = await response.json()
        if (data.resultCount === 0) return null

        const results: any[] = data.results

        // If duration is provided, find the best match
        if (targetDurationMs) {
            const bestMatch = results.find(track => {
                const diff = Math.abs(track.trackTimeMillis - targetDurationMs)
                return diff < 5000 // Allow 5 seconds difference
            })
            if (bestMatch) return formatAppleTrack(bestMatch)
        }

        // Default to first result if no duration match found or provided
        return formatAppleTrack(results[0])
    } catch (error) {
        console.error('Apple Music search failed:', error)
        return null
    }
}

function formatAppleTrack(track: any): AppleMusicTrack {
    return {
        trackName: track.trackName,
        artistName: track.artistName,
        previewUrl: track.previewUrl,
        artworkUrl100: track.artworkUrl100,
        trackViewUrl: track.trackViewUrl,
        trackTimeMillis: track.trackTimeMillis
    }
}
