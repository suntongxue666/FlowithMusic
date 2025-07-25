import Header from '@/components/Header'
import MusicCards from '@/components/MusicCards'
import Footer from '@/components/Footer'

export default function ExplorePage() {
  return (
    <main>
      <Header currentPage="explore" />
      <div className="explore-container">
        <div className="explore-header">
          <h1>Explore Music Letters</h1>
          <p>Discover heartfelt messages shared through music by our community</p>
        </div>
        <MusicCards />
      </div>
      <Footer />
    </main>
  )
}