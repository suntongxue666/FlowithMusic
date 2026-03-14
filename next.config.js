/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.scdn.co'],
  },
  // 强制 www 版本（避免 www / non-www 重复）
  async redirects() {
    return [
      // 将无 www 重定向到有 www
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'flowithmusic.com' }],
        destination: 'https://www.flowithmusic.com/:path*',
        permanent: true,
      },
    ]
  },
  // 为 debug/test 等无效路由添加自定义 headers
  async headers() {
    return [
      {
        source: '/debug/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/test/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/fix-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/clean-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/reset-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/migrate-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/check-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/simple-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/oauth-/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/auth/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/410',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // 屏蔽所有带有 debug= 参数的请求（如果可能）
        source: '/:path*',
        has: [{ type: 'query', key: 'debug' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/debug/:path*',
        destination: '/410',
      },
      {
        source: '/test/:path*',
        destination: '/410',
      },
      {
        source: '/fix-/:path*',
        destination: '/410',
      },
      {
        source: '/clean-/:path*',
        destination: '/410',
      },
      {
        source: '/reset-/:path*',
        destination: '/410',
      },
      {
        source: '/migrate-/:path*',
        destination: '/410',
      },
      {
        source: '/check-/:path*',
        destination: '/410',
      },
      {
        source: '/simple-/:path*',
        destination: '/410',
      },
      {
        source: '/oauth-/:path*',
        destination: '/410',
      }
    ]
  },
}

module.exports = nextConfig