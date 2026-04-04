'use client'

import React, { useState, useEffect } from 'react'
import { adList } from '@/lib/adConfig'

const AdBanner: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (adList.length <= 1) return

    const timer = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % adList.length)
        setIsTransitioning(false)
      }, 500) // Match transition duration
    }, 10000) // 10 seconds

    return () => clearInterval(timer)
  }, [])

  const currentAd = adList[currentIndex]

  return (
    <div className="ad-banner relative overflow-hidden rounded-xl border border-white/5 bg-white/5">
      <a 
        href={currentAd.linkUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block transition-all duration-700 ease-in-out ${
          isTransitioning ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'
        }`}
      >
        <img 
          src={currentAd.imageUrl} 
          alt={currentAd.altText}
          className="ad-image w-full h-auto max-w-[700px] mx-auto shadow-2xl hover:brightness-110 transition-all duration-300"
        />
      </a>
      
      {/* 轮播指示器 */}
      {adList.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {adList.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'bg-white w-6' : 'bg-white/20 w-2 hover:bg-white/40'
              }`}
              aria-label={`Go to ad ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdBanner