import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Musical Messages History | FlowithMusic - Your Song Letters',
  description: 'View and manage your sent musical messages. Track your song letters, see interactions and reactions from friends. Keep your musical memories organized.',
  keywords: 'musical message history, my song letters, sent music messages, message management, musical memories, track song letters, message interactions, music message dashboard',
  openGraph: {
    title: 'My Musical Messages History | FlowithMusic',
    description: 'View and manage your sent musical messages. Track your song letters and see interactions from friends.',
    type: 'website',
    url: 'https://flowithmusic.com/history',
    images: [
      {
        url: '/og-history-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Musical Messages History | FlowithMusic',
    description: 'View and manage your sent musical messages. Track your song letters and see interactions from friends.',
    images: ['/og-history-image.jpg'],
  },
  alternates: {
    canonical: 'https://flowithmusic.com/history',
  },
}

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}