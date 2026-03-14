export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Allow: /send
Allow: /letter/*
Allow: /explore
Allow: /love
Allow: /friendship
Allow: /family
Allow: /history
Allow: /terms
Allow: /privacy
Allow: /sitemap
Allow: /letters/*

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
Disallow: /sitemap/ # Block the directory, allow the xml
Disallow: /test-analytics
Disallow: /test-google-auth
Disallow: /test-google-login
Disallow: /test-google-oauth
Disallow: /test-simple-storage
Disallow: /test-social-media
Disallow: /test-social-media-fix
Disallow: /test-social-media-save
Disallow: /test-supabase
Disallow: /test-supabase-connection
Disallow: /test-user-creation
Disallow: /test-user-identity
Disallow: /test-user-sync
Disallow: /check-interactions
Disallow: /clean-cache
Disallow: /clean-test-data
Disallow: /debug-auth
Disallow: /debug-auth-user
Disallow: /debug-db-connection
Disallow: /debug-db-schema
Disallow: /debug-emoji
Disallow: /debug-letter
Disallow: /debug-letters
Disallow: /debug-letters-flow
Disallow: /debug-social-media
Disallow: /debug-sunwei-letters
Disallow: /debug-supabase
Disallow: /debug-user-id
Disallow: /debug-user-letters
Disallow: /debug-user-letters-direct
Disallow: /debug-user-state
Disallow: /debug-user-table
Disallow: /debug-visibility
Disallow: /fix-letters-display
Disallow: /fix-sunwei-letters
Disallow: /migrate-data
Disallow: /oauth-config
Disallow: /reset-data
Disallow: /simple-supabase-test
Disallow: /test-analytics
Disallow: /test-auth
Disallow: /test-database
Disallow: /test-google-auth
Disallow: /test-google-login
Disallow: /test-google-oauth
Disallow: /test-history
Disallow: /test-new-features
Disallow: /test-simple-storage
Disallow: /test-social-media
Disallow: /test-social-media-fix
Disallow: /test-social-media-save
Disallow: /test-supabase
Disallow: /test-supabase-connection
Disallow: /test-user-creation
Disallow: /test-user-identity
Disallow: /test-user-sync
Disallow: /check-interactions
Disallow: /clean-cache
Disallow: /clean-test-data
Disallow: /debug-auth
Disallow: /debug-auth-user
Disallow: /debug-db-connection
Disallow: /debug-db-schema
Disallow: /debug-emoji
Disallow: /debug-letter
Disallow: /debug-letters
Disallow: /debug-letters-flow
Disallow: /debug-social-media
Disallow: /debug-sunwei-letters
Disallow: /debug-supabase
Disallow: /debug-user-id
Disallow: /debug-user-letters
Disallow: /debug-user-letters-direct
Disallow: /debug-user-state
Disallow: /debug-user-table
Disallow: /debug-visibility
Disallow: /fix-letters-display
Disallow: /fix-sunwei-letters
Disallow: /migrate-data
Disallow: /oauth-config
Disallow: /reset-data
Disallow: /simple-supabase-test
Disallow: /test-analytics
Disallow: /test-auth
Disallow: /test-database
Disallow: /test-google-auth
Disallow: /test-google-login
Disallow: /test-google-oauth
Disallow: /test-history
Disallow: /test-new-features
Disallow: /test-simple-storage
Disallow: /test-social-media
Disallow: /test-social-media-fix
Disallow: /test-social-media-save
Disallow: /test-supabase
Disallow: /test-supabase-connection
Disallow: /test-user-creation
Disallow: /test-user-identity
Disallow: /test-user-sync

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