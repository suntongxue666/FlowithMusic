import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import MusicCards from '@/components/MusicCards'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Header currentPage="home" />
      <Hero />
      <div className="desktop-only">
        <Features />
      </div>
      <MusicCards />
      <Footer />
    </main>
  )
}