import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Send a Musical Message | FlowithMusic - Connect Through Songs',
  description: 'Create and send personalized musical messages to friends. Choose a song, write your message, and share your feelings through music. Free music message platform with emoji reactions.',
  keywords: 'send the song, send a song to a friend, musical messages, music message platform, send songs online, personalized song messages, handwritten musical letter, share music with friends, emotional music sharing, song dedication, create musical memories, express feelings through music',
  openGraph: {
    title: 'Send a Musical Message | FlowithMusic',
    description: 'Create and send personalized musical messages to friends. Choose a song, write your message, and share your feelings through music.',
    type: 'website',
    url: 'https://flowithmusic.com/send',
    images: [
      {
        url: '/og-send-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Send a Musical Message | FlowithMusic',
    description: 'Create and send personalized musical messages to friends. Choose a song, write your message, and share your feelings through music.',
    images: ['/og-send-image.jpg'],
  },
  alternates: {
    canonical: 'https://flowithmusic.com/send',
  },
}

export default function SendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}