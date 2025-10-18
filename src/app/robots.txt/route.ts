export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /

# Specific rules for important pages
Allow: /send
Allow: /letter/*
Allow: /explore
Allow: /history

# Block admin and test pages
Disallow: /api/
Disallow: /debug*
Disallow: /test*
Disallow: /admin/
Disallow: /_next/
Disallow: /clean-cache
Disallow: /reset-data
Disallow: /migrate-data

# Sitemap location
Sitemap: https://www.flowithmusic.com/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // 缓存24小时
    },
  })
}