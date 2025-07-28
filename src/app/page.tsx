import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import MusicCards from '@/components/MusicCards'
import RecentPostsCarousel from '@/components/RecentPostsCarousel'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Header currentPage="home" />
      <Hero />
      <div className="desktop-only">
        <Features />
      </div>
      {/* Recent Posts 轮播 - 每页6个卡片，每小时更新数据 */}
      <RecentPostsCarousel 
        cardsPerPage={6}
        autoPlay={true}
        showControls={true}
      />
      
      <Footer />
    </main>
  )
}