'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import ExploreCards from '@/components/ExploreCards'
import Footer from '@/components/Footer'

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <main>
      <Header currentPage="explore" />
      <div className="explore-container">
        <div className="explore-header">
          <h1>Explore Music Letters</h1>
          <p>Discover heartfelt messages shared through music by our community</p>
        </div>

        <div className="search-container">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Input recipient,song,artist to find same tune"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={(e) => e.target.placeholder = ''}
              onBlur={(e) => e.target.placeholder = 'Input recipient,song,artist to find same tune'}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        </div>

        <div className="category-quick-links" style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px 0', flexWrap: 'wrap' }}>
          {[
            { id: 'Love', label: 'Love', link: '/love', icon: '❤️' },
            { id: 'Friendship', label: 'Friendship', link: '/friendship', icon: '🤝' },
            { id: 'Family', label: 'Family', link: '/family', icon: '🏠' }
          ].map(cat => (
            <a
              href={cat.link}
              key={cat.id}
              className="cat-link"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                borderRadius: '25px', background: '#f8f9fa', border: '1px solid #eee',
                textDecoration: 'none', color: '#333', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </a>
          ))}
        </div>

        <ExploreCards searchQuery={searchQuery} />
      </div>
      <Footer />
    </main>
  )
}