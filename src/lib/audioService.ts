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
        console.log('🌍 [Detection] Starting robust detection...')

        // 1. 快速检查：缓存、时区、语言（零延迟）
        const cached = getCachedResult()
        if (cached.valid) return cached.isChina

        if (checkTimezone()) {
            console.log('🌍 [Detection] ✅ Fast Track: China Timezone detected')
            saveCache(true)
            return true
        }

        if (checkBrowserLanguage()) {
            console.log('🌍 [Detection] 💡 Fast Track: Browser language suggests China')
            // 不直接返回 true，配合 IP 校验结果更准，但如果没有 IP 结果，这可以作为依据
        }

        // 2. 并行 IP API 检测 (使用 HTTPS 优先且不通则跳过)
        const reliableApis = [
            'https://api.country.is/', // 支持 HTTPS
            'https://ipapi.co/json/',    // 支持 HTTPS
            'https://api.ipify.org?format=json' // 备用
        ]

        // 创建带超时的 Fetch
        const fetchWithTimeout = async (url: string) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2000)
            try {
                const response = await fetch(url, { signal: controller.signal })
                clearTimeout(timeoutId)
                if (!response.ok) throw new Error('API Error')
                const data = await response.json()
                const country = (data.countryCode || data.country_code || data.country || '').toUpperCase()
                return country
            } catch (e) {
                clearTimeout(timeoutId)
                throw e
            }
        }

        try {
            // 实现简单的 Promise.any 兼容逻辑：获取第一个成功的响应
            const countryCode = await new Promise<string>((resolve, reject) => {
                let errors = 0
                reliableApis.forEach(url => {
                    fetchWithTimeout(url)
                        .then(resolve)
                        .catch(() => {
                            errors++
                            if (errors === reliableApis.length) reject(new Error('All failed'))
                        })
                })
            })
            console.log('🌍 [Detection] Fastest API result:', countryCode)
            
            const isChina = countryCode === 'CN' || countryCode === 'CHN'
            saveCache(isChina)
            return isChina
        } catch (perError) {
            console.warn('🌍 [Detection] All IP APIs failed or timed out')
        }

        // 3. 终极兜底：如果 API 均不可达，通过时区与语言双重判定
        if (checkTimezone() || checkBrowserLanguage()) {
            console.log('🌍 [Detection] Final fallback: System signals indicate China region')
            saveCache(true)
            return true
        }

        return false
    } catch (error) {
        console.warn('🌍 [Detection] Total failure, defaulting to Global:', error)
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
                return diff < 12000 // Loosened from 5s to 12s for better remastered matching
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
