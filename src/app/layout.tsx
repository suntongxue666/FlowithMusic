import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowithMusic - Music that connects hearts',
  description: 'Pick a song and write a message — send it to an old friend or find someone new who feels the same tune.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}