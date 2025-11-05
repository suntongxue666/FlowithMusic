'use client'

import React from 'react'
import { defaultAdConfig } from '@/lib/adConfig'

interface AdBannerProps {
  config?: typeof defaultAdConfig
}

const AdBanner: React.FC<AdBannerProps> = ({ config = defaultAdConfig }) => {
  return (
    <div className="ad-banner">
      <a href={config.linkUrl} target="_blank" rel="noopener noreferrer">
        <img 
          src={config.imageUrl} 
          alt={config.altText}
          className="ad-image"
          style={{ width: '100%', height: 'auto', maxWidth: '700px' }}
        />
      </a>
    </div>
  )
}

export default AdBanner