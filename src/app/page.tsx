import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import MusicCards from '@/components/MusicCards'

export default function Home() {
  return (
    <main>
      <Header currentPage="home" />
      <Hero />
      <Features />
      <MusicCards />
    </main>
  )
}