import { supabase } from '@/lib/supabase'

export async function GET() {
  const baseUrl = 'https://www.flowithmusic.com'
  
  // 获取所有公开的letters
  let letters: any[] = []
  
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('letters')
        .select('link_id, created_at, updated_at, song_title, song_artist')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(1000) // 限制数量避免sitemap过大
      
      if (!error && data) {
        letters = data
      }
    }
  } catch (error) {
    console.error('Failed to fetch letters for sitemap:', error)
  }

  // 生成letter页面的sitemap条目
  const letterUrls = letters.map(letter => `
  <url>
    <loc>${baseUrl}/letter/${letter.link_id}</loc>
    <lastmod>${new Date(letter.updated_at || letter.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/send</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/history</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/explore</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>${letterUrls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // 缓存1小时
    },
  })
}