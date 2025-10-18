import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore Musical Messages | FlowithMusic - Discover Song Letters',
  description: 'Discover and explore musical messages shared by others. Find inspiration, react with emojis, and connect with people who share your musical taste. Browse through heartfelt song letters.',
  keywords: 'explore music messages, discover song letters, musical inspiration, browse music messages, find musical connections, explore song dedications, music community, song recommendations, discover new music, musical social platform',
  openGraph: {
    title: 'Explore Musical Messages | FlowithMusic',
    description: 'Discover and explore musical messages shared by others. Find inspiration and connect with people who share your musical taste.',
    type: 'website',
    url: 'https://flowithmusic.com/explore',
    images: [
      {
        url: '/og-explore-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Musical Messages | FlowithMusic',
    description: 'Discover and explore musical messages shared by others. Find inspiration and connect with people who share your musical taste.',
    images: ['/og-explore-image.jpg'],
  },
  alternates: {
    canonical: 'https://flowithmusic.com/explore',
  },
}

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}