import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext'
import UserIdentityNotification from '@/components/UserIdentityNotification'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.flowithmusic.com'),
  title: 'FlowithMusic - Send the song, Connect with Hearts Through Music',
  description: 'Pick a song, write a message, send the song to a friend or who shares the same tune. A unique way to connect through music and create meaningful, heartfelt messages.',
  keywords: 'Send a song, Send the song, Send the prayer, Hello I\'m sorry, Musical messages, Send a musical message, Heartfelt song dedications, Send songs to friends, Music that connects hearts, Express feelings through music, Personalized song messages, Song-based message sharing, Create musical memories, Send love through songs, Emotional music sharing, Music message platform',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.flowithmusic.com',
    siteName: 'FlowithMusic',
    title: 'FlowithMusic - Send the song, Connect with Hearts Through Music',
    description: 'Pick a song, write a message, send the song to a friend or who shares the same tune. A unique way to connect through music and create meaningful, heartfelt messages.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowithMusic - Send the song, Connect with Hearts Through Music',
    description: 'Pick a song, write a message, send the song to a friend or who shares the same tune. A unique way to connect through music and create meaningful, heartfelt messages.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://www.flowithmusic.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Caveat 手写字体 - Safari 浏览器优化 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-6BS9TLZYRQ"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6BS9TLZYRQ');
            `,
          }}
        />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8076620471820789"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <UserProvider>
          {children}
          <UserIdentityNotification />
        </UserProvider>
      </body>
    </html>
  )
}