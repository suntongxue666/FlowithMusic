'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import ExploreCards from '@/components/ExploreCards'
import Footer from '@/components/Footer'
import AdBanner from '@/components/AdBanner'

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
        
        <div className="ad-section">
          <AdBanner />
        </div>
        
        <ExploreCards searchQuery={searchQuery} />
      </div>
      <Footer />
    </main>
  )
}