'use client'

import Header from '@/components/Header'
import ExploreCards from '@/components/ExploreCards'
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
        
        <ExploreCards />
      </div>
      <Footer />
      
      <style jsx>{`
        .explore-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          min-height: calc(100vh - 80px);
        }

        .explore-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .explore-header h1 {
          font-family: 'Nanum Pen Script', cursive;
          font-size: 2.5rem;
          font-weight: 400;
          line-height: 1.4;
          margin-bottom: 1rem;
          color: #333;
        }

        .explore-header p {
          font-size: 1.25rem;
          color: #666;
          margin: 0;
        }



        @media (max-width: 768px) {
          .explore-container {
            padding: 1rem;
          }

          .explore-header h1 {
            font-size: 2rem;
          }

          .explore-header p {
            font-size: 1rem;
          }


        }
      `}</style>
    </main>
  )
}