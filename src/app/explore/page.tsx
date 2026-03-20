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
    <main className="min-h-screen">
      <Header currentPage="explore" />
      <div className="explore-container w-full px-4">
        <div className="explore-header">
          <h1 className="page-title">Explore Music Letters</h1>
          <p className="page-description">Discover heartfelt messages shared through music by our community</p>
        </div>

        <div className="search-container flex justify-center w-full">
          <div className="search-box w-full max-w-2xl">
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
              className="search-btn h-[64px] sm:h-auto"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        </div>

        <div className="category-quick-links" style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0', flexWrap: 'wrap' }}>
          {[
            { id: 'Love', label: 'Love', link: '/love', icon: '❤️' },
            { id: 'Friendship', label: 'Friendship', link: '/friendship', icon: '🤝' },
            { id: 'Family', label: 'Family', link: '/family', icon: '🏠' }
          ].map(cat => (
            <a
              href={cat.link}
              key={cat.id}
              className="h5-cat-link" // 使用同Home页一样的类名便于排查，但此处直接改style更可靠
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                borderRadius: '25px', background: 'white', border: '1px solid #eee',
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