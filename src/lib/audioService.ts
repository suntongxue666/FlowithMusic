export async function checkIsChinaIP(): Promise<boolean> {
    try {
        // Signal 1: Check Browser Timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (timezone === 'Asia/Shanghai' || timezone === 'Asia/Urumqi') return true

        // Signal 2: Check Browser Language - REMOVED to avoid false positives for overseas users
        /* 
        if (typeof window !== 'undefined' && window.navigator.languages.some(lang => lang.includes('zh-CN'))) {
            return true
        }
        */

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
    targetDurationMs?: number,
    country: string = 'US'
): Promise<AppleMusicTrack | null> {
    try {
        // Try original title first
        let track = await executeAppleSearch(songTitle, artistName, targetDurationMs, country);

        // If not found, try a "cleaned" title to strip Spotify noise
        if (!track) {
            const cleanedTitle = cleanSongTitle(songTitle);
            if (cleanedTitle !== songTitle) {
                console.log(`🔍 Apple Music: Trying cleaned title: "${cleanedTitle}" (Original: "${songTitle}")`);
                track = await executeAppleSearch(cleanedTitle, artistName, targetDurationMs, country);
            }
        }

        return track;
    } catch (error) {
        console.error('Apple Music search failed:', error)
        return null
    }
}

async function executeAppleSearch(
    songTitle: string,
    artistName: string,
    targetDurationMs?: number,
    country: string = 'US'
): Promise<AppleMusicTrack | null> {
    const term = encodeURIComponent(`${songTitle} ${artistName}`)
    const response = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5&country=${country}`)

    if (!response.ok) return null

    const data = await response.json()
    if (data.resultCount === 0) {
        // If CN search fails, try US as fallback
        if (country === 'CN') {
            return executeAppleSearch(songTitle, artistName, targetDurationMs, 'US')
        }
        return null
    }

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
}

/**
 * Strips common Spotify metadata suffixes that break iTunes search.
 */
function cleanSongTitle(title: string): string {
    return title
        .split(' - ')[0] // Strip " - Remastered", " - 2014 Remaster", etc.
        .split(' (')[0]  // Optionally strip "(Deluxe Edition)", but be careful with "(Taylor's Version)"
        .trim();
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
