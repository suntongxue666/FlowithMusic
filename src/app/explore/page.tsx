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
        
        <ExploreCards searchQuery={searchQuery} />
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

        .search-container {
          max-width: 800px;
          margin: 0 auto 3rem auto;
          display: flex;
          justify-content: center;
        }

        .search-box {
          display: flex;
          width: 100%;
          max-width: 600px;
          gap: 0.5rem;
        }

        .search-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s ease;
          background: white;
          box-shadow: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }

        .search-input:focus {
          border-color: #333;
          box-shadow: none;
        }

        .search-btn {
          padding: 12px 24px;
          background: #333;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
          white-space: nowrap;
        }

        .search-btn:hover {
          background: #555;
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

          .search-container {
            margin-bottom: 2rem;
            padding: 0 1rem;
          }

          .search-box {
            max-width: none;
            width: 100%;
            justify-content: center;
          }

          .search-input {
            font-size: 16px;
            padding: 10px 8px;
          }

          .search-btn {
            padding: 10px 20px;
            font-size: 14px;
            height: 42px;
            display: flex;
            align-items: center;
          }
        }
      `}</style>
    </main>
  )
}