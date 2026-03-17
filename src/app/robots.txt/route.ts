export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /send
Allow: /explore
Allow: /love
Allow: /friendship
Allow: /family
Allow: /history
Allow: /terms
Allow: /privacy
Allow: /sitemap
Allow: /letters/*

# Block letter detail pages from crawling
Disallow: /letter/*

# Block all debug, test, fix, admin, and utility pages
Disallow: /api/
Disallow: /_next/
Disallow: /auth/
Disallow: /admin/
Disallow: /debug*
Disallow: /test*
Disallow: /fix-*
Disallow: /clean-*
Disallow: /reset-*
Disallow: /migrate-*
Disallow: /check-*
Disallow: /simple-*
Disallow: /oauth-*
Disallow: /410
Disallow: /*?debug=
Disallow: /*?test=
Disallow: /sitemap/
Disallow: /user/*
Disallow: /notifications
Disallow: /premium

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