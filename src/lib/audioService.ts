export async function checkIsChinaIP(): Promise<boolean> {
    try {
        console.log('🌍 [Detection] Starting IP detection...')

        // 尝试多个 IP API 提高可靠性
        const apis = [
            { url: 'https://ipapi.co/json/', field: 'country_code' },
            { url: 'https://api.ipify.org?format=json', field: null }, // 这个API不返回国家码，跳过
            { url: 'https://ipapi.co/json/', field: 'country' }
        ]

        // 首先尝试更可靠的 API
        const reliableApis = [
            'https://api.ipgeolocation.io/ipgeo?apiKey=free',
            'https://ipapi.co/json/'
        ]

        for (const apiUrl of reliableApis) {
            try {
                console.log('🌍 [Detection] Trying:', apiUrl)
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                
                if (!response.ok) {
                    console.warn('🌍 [Detection] API response not OK:', response.status)
                    continue
                }

                const data = await response.json()
                console.log('🌍 [Detection] API response:', data)

                // 检查多种可能的字段名
                const possibleFields = ['country_code', 'countryCode', 'country', 'country_name', 'countryName']
                
                for (const field of possibleFields) {
                    if (data[field]) {
                        const countryCode = String(data[field]).toUpperCase()
                        console.log('🌍 [Detection] Found country code:', countryCode, 'from field:', field)
                        
                        if (countryCode === 'CN' || countryCode === 'CHN' || countryCode === 'CHINA') {
                            console.log('🌍 [Detection] ✅ Confirmed China IP')
                            return true
                        }
                    }
                }
            } catch (e) {
                console.warn('🌍 [Detection] API failed:', apiUrl, e)
                continue
            }
        }

        // 备用方案：使用浏览器语言检测
        console.log('🌍 [Detection] IP APIs failed, checking browser language as fallback')
        const browserLang = navigator.language || ''
        console.log('🌍 [Detection] Browser language:', browserLang)
        
        if (browserLang.startsWith('zh') || browserLang.startsWith('ZH')) {
            console.log('🌍 [Detection] ✅ Browser language suggests China')
            return true
        }

        console.log('🌍 [Detection] ❌ Not detected as China')
        return false
    } catch (error) {
        console.warn('🌍 [Detection] Failed, defaulting to false:', error)
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
