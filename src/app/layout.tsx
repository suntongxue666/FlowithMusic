import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext'

export const metadata: Metadata = {
  title: 'FlowithMagic - Send the song, Connect with Hearts Through Music',
  description: 'Pick a song, write a message, send the song to a friend or who shares the same tune. A unique way to connect through music and create meaningful, heartfelt messages.',
  keywords: 'Send a song, Send the song, Send the prayer, Hello I\'m sorry, Musical messages, Send a musical message, Heartfelt song dedications, Send songs to friends, Music that connects hearts, Express feelings through music, Personalized song messages, Song-based message sharing, Create musical memories, Send love through songs, Emotional music sharing, Music message platform',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
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
      </head>
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}