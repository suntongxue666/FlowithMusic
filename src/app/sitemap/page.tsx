'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function SitemapPage() {
  const baseUrl = 'https://www.flowithmusic.com'
  
  const pages = [
    {
      url: '/',
      title: 'Home',
      description: 'Discover heartfelt messages shared through music',
      priority: 'High',
      frequency: 'Daily'
    },
    {
      url: '/send',
      title: 'Send a Letter',
      description: 'Create and send a musical message to someone special',
      priority: 'High',
      frequency: 'Weekly'
    },
    {
      url: '/explore',
      title: 'Explore Letters',
      description: 'Browse all music letters shared by our community',
      priority: 'High',
      frequency: 'Daily'
    },
    {
      url: '/history',
      title: 'Your History',
      description: 'View your previously sent music letters',
      priority: 'Medium',
      frequency: 'Weekly'
    },
    {
      url: '/terms',
      title: 'Terms of Service',
      description: 'Our terms and conditions',
      priority: 'Low',
      frequency: 'Monthly'
    },
    {
      url: '/privacy',
      title: 'Privacy Policy',
      description: 'How we protect your privacy',
      priority: 'Low',
      frequency: 'Monthly'
    }
  ]

  return (
    <main>
      <Header />
      <div className="sitemap-container">
        <div className="sitemap-header">
          <h1>Site Map</h1>
          <p>Navigate through all pages of FlowithMusic</p>
        </div>
        
        <div className="sitemap-content">
          <div className="sitemap-grid">
            {pages.map((page, index) => (
              <div key={index} className="sitemap-card">
                <h3>
                  <a href={`${baseUrl}${page.url}`} className="sitemap-link">
                    {page.title}
                  </a>
                </h3>
                <p className="sitemap-description">{page.description}</p>
                <div className="sitemap-meta">
                  <span className="sitemap-priority">Priority: {page.priority}</span>
                  <span className="sitemap-frequency">Updates: {page.frequency}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="sitemap-info">
            <h2>About This Sitemap</h2>
            <p>
              This sitemap shows all the main pages of FlowithMusic. Each page is designed to help you 
              share and discover music through heartfelt messages. Navigate to any page using the links above.
            </p>
            <p>
              For search engines, we also provide an <a href="/sitemap.xml" className="sitemap-xml-link">XML sitemap</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
      
      <style jsx>{`
        .sitemap-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 60vh;
        }
        
        .sitemap-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .sitemap-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .sitemap-header p {
          font-size: 1.1rem;
          color: #666;
        }
        
        .sitemap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }
        
        .sitemap-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid #e5e5e5;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .sitemap-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        
        .sitemap-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .sitemap-link {
          color: #333;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .sitemap-link:hover {
          color: #007BFF;
        }
        
        .sitemap-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1rem;
        }
        
        .sitemap-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
        }
        
        .sitemap-priority,
        .sitemap-frequency {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          background: #f8f9fa;
          color: #555;
          font-weight: 500;
        }
        
        .sitemap-info {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
        }
        
        .sitemap-info h2 {
          margin-bottom: 1rem;
          color: #333;
        }
        
        .sitemap-info p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1rem;
        }
        
        .sitemap-xml-link {
          color: #007BFF;
          text-decoration: none;
          font-weight: 500;
        }
        
        .sitemap-xml-link:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 768px) {
          .sitemap-container {
            padding: 1rem;
          }
          
          .sitemap-header h1 {
            font-size: 2rem;
          }
          
          .sitemap-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .sitemap-card {
            padding: 1.5rem;
          }
          
          .sitemap-meta {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </main>
  )
}