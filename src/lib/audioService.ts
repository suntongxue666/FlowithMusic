// 中国时区列表
const CHINA_TIMEZONES = [
    'Asia/Shanghai',
    'Asia/Chongqing',
    'Asia/Harbin',
    'Asia/Urumqi',
    'Asia/Beijing'
]

// 缓存相关常量
const CACHE_KEY = 'flowithmusic_china_detection'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

interface CacheData {
    isChina: boolean
    timestamp: number
}

// 检查缓存
function getCachedResult(): { isChina: boolean; valid: boolean } {
    try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
            const data: CacheData = JSON.parse(cached)
            const now = Date.now()
            if (now - data.timestamp < CACHE_DURATION) {
                console.log('🌍 [Detection] ✅ Using cached result:', data.isChina)
                return { isChina: data.isChina, valid: true }
            }
        }
    } catch (e) {
        console.warn('🌍 [Detection] Cache read failed:', e)
    }
    return { isChina: false, valid: false }
}

// 保存缓存
function saveCache(isChina: boolean): void {
    try {
        const data: CacheData = {
            isChina,
            timestamp: Date.now()
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(data))
        console.log('🌍 [Detection] 📦 Cached result:', isChina)
    } catch (e) {
        console.warn('🌍 [Detection] Cache save failed:', e)
    }
}

// 时区检测
function checkTimezone(): boolean {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        console.log('🌍 [Detection] Timezone:', timezone)
        
        if (CHINA_TIMEZONES.includes(timezone)) {
            console.log('🌍 [Detection] ✅ China timezone detected')
            return true
        }
    } catch (e) {
        console.warn('🌍 [Detection] Timezone check failed:', e)
    }
    return false
}

// 浏览器语言检测
function checkBrowserLanguage(): boolean {
    try {
        const browserLang = navigator.language || ''
        const languages = navigator.languages || []
        
        console.log('🌍 [Detection] Browser language:', browserLang, 'languages:', languages)
        
        // 检查主语言
        if (browserLang.toLowerCase().startsWith('zh')) {
            // 排除香港和台湾
            const lowerLang = browserLang.toLowerCase()
            if (!lowerLang.includes('hk') && !lowerLang.includes('tw') && !lowerLang.includes('hong') && !lowerLang.includes('taiwan')) {
                console.log('🌍 [Detection] ✅ Browser language suggests China (zh-CN)')
                return true
            }
        }
        
        // 检查语言列表
        for (const lang of languages) {
            const lowerLang = lang.toLowerCase()
            if (lowerLang.startsWith('zh') && !lowerLang.includes('hk') && !lowerLang.includes('tw')) {
                console.log('🌍 [Detection] ✅ Found zh-CN in language list')
                return true
            }
        }
    } catch (e) {
        console.warn('🌍 [Detection] Browser language check failed:', e)
    }
    return false
}

export async function checkIsChinaIP(): Promise<boolean> {
    try {
        console.log('🌍 [Detection] Starting IP detection...')

        // 1. 首先检查缓存
        const cached = getCachedResult()
        if (cached.valid) {
            return cached.isChina
        }

        // 1.5 快速本地检查 (时区和语言) - 解决中国大陆访问外部API超时的问题
        if (checkTimezone() || checkBrowserLanguage()) {
            console.log('🌍 [Detection] ✅ Fast local check confirmed China IP')
            saveCache(true)
            return true
        }

        // 2. IP API 检测 - 只依赖 IP API
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
                            saveCache(true)
                            return true
                        } else {
                            console.log('🌍 [Detection] ❌ Non-China IP:', countryCode)
                            saveCache(false)
                            return false
                        }
                    }
                }
            } catch (e) {
                console.warn('🌍 [Detection] API failed:', apiUrl, e)
                continue
            }
        }

        // 所有 IP API 都失败，默认返回 false（使用 Spotify）
        console.log('🌍 [Detection] ❌ All IP APIs failed, defaulting to Spotify')
        saveCache(false)
        return false
        saveCache(false)
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
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5&country=${country}`
    
    console.log('🎵 [Apple Music] Searching:', url)
    
    try {
        // 添加 8 秒超时
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
            console.log('🎵 [Apple Music] Response not OK:', response.status)
            return null
        }

        const data = await response.json()
        console.log('🎵 [Apple Music] Results:', data.resultCount)
        
        if (data.resultCount === 0) {
            console.log('🎵 [Apple Music] No results found')
            return null
        }

        const results: any[] = data.results

        // If duration is provided, find the best match
        if (targetDurationMs) {
            const bestMatch = results.find(track => {
                const diff = Math.abs(track.trackTimeMillis - targetDurationMs)
                return diff < 5000 // Allow 5 seconds difference
            })
            if (bestMatch) {
                console.log('🎵 [Apple Music] Found duration match:', bestMatch.trackName)
                return formatAppleTrack(bestMatch)
            }
        }

        // Default to first result if no duration match found or provided
        console.log('🎵 [Apple Music] Using first result:', results[0].trackName)
        return formatAppleTrack(results[0])
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('🎵 [Apple Music] Request timeout (8s)')
        } else {
            console.error('🎵 [Apple Music] Search failed:', error)
        }
        return null
    }
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
