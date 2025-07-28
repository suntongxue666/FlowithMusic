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
      {/* 新的轮播组件 - 开发环境测试 */}
      {process.env.NODE_ENV === 'development' ? (
        <>
          <div style={{ margin: '2rem auto', maxWidth: '1200px', padding: '0 1rem', textAlign: 'center' }}>
            <div style={{ 
              background: '#f0f8ff', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '2rem',
              border: '2px dashed #007bff'
            }}>
              <h3 style={{ color: '#007bff', margin: '0 0 0.5rem 0' }}>🚧 新功能测试</h3>
              <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                轮播版本 (6个卡片) - 如果效果不好会改为3个卡片版本
              </p>
            </div>
          </div>
          
          {/* 6个卡片版本 */}
          <RecentPostsCarousel 
            cardsPerPage={6}
            autoPlay={true}
            showControls={true}
          />
          
          <div style={{ margin: '3rem auto', maxWidth: '1200px', padding: '0 1rem', textAlign: 'center' }}>
            <div style={{ 
              background: '#fff8f0', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '2rem',
              border: '2px dashed #ff8c00'
            }}>
              <h3 style={{ color: '#ff8c00', margin: '0 0 0.5rem 0' }}>🎯 备选方案</h3>
              <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                3个卡片版本 - 更简洁的展示方式
              </p>
            </div>
          </div>
          
          {/* 3个卡片版本 */}
          <RecentPostsCarousel 
            cardsPerPage={3}
            autoPlay={true}
            showControls={true}
          />
        </>
      ) : (
        <MusicCards />
      )}
      
      <Footer />
    </main>
  )
}