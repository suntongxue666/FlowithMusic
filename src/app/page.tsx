import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import MusicCards from '@/components/MusicCards'
import RecentPostsCarousel from '@/components/RecentPostsCarousel'
import ArtistLetters from '@/components/ArtistLetters'
import Footer from '@/components/Footer'
import AdBanner from '@/components/AdBanner'

export default function Home() {
  return (
    <main>
      <Header currentPage="home" />
      <Hero />
      <div className="desktop-only">
        <Features />
      </div>
      
      {/* Recent Posts 轮播 - 每页6个卡片，每小时更新数据 */}
      {/* Explore Letters 广告横幅 */}
      <div className="explore-letters-ad">
        <AdBanner />
      </div>
      
      <RecentPostsCarousel 
        cardsPerPage={6}
        autoPlay={true}
        showControls={true}
      />
      
      {/* Posts with Artist - 每个艺术家显示3个卡片，最多2个艺术家，每3小时更新 */}
      <ArtistLetters />
      

      
      <Footer />
    </main>
  )
}