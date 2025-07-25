import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowithMusic - Music that connects hearts',
  description: 'Pick a song and write a message — send it to an old friend or find someone new who feels the same tune.',
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
        {children}
      </body>
    </html>
  )
}