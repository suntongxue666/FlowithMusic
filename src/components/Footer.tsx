'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <footer className="footer mobile-footer">
        <div className="footer-container">
          <div className="footer-section mobile-horizontal">
            <h3>Features</h3>
            <div className="mobile-links">
              <Link href="/">Home</Link>
              <Link href="/send">Send</Link>
              <Link href="/history">History</Link>
              <Link href="/explore">Explore</Link>
            </div>
          </div>
          
          <div className="footer-section mobile-horizontal">
            <h3>Contact us</h3>
            <div className="mobile-links">
              <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
            </div>
          </div>
          
          <div className="footer-section mobile-horizontal">
            <h3>Legal</h3>
            <div className="mobile-links">
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/sitemap">Sitemap</Link>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 <span>FlowithMusic</span>. All rights reserved.</p>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="footer desktop-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-brand-header">
              <img 
                src="https://ciwjjfcuhubjydajazkk.supabase.co/storage/v1/object/public/webstie-icon//FlowtithMusic-100.png" 
                alt="FlowithMusic" 
                className="footer-logo"
              />
              <h2 className="footer-brand-name" style={{ fontFamily: "'Caveat', cursive" }}>FlowithMusic</h2>
            </div>
            <p className="footer-tagline handwritten">Songs carry your unsaid words — that connects hearts.</p>
          </div>
          
          <div className="footer-sections">
            <div className="footer-section">
              <h3>Features</h3>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/send">Send</Link></li>
                <li><Link href="/history">History</Link></li>
                <li><Link href="/explore">Explore</Link></li>
                <li><Link href="/sitemap">Sitemap</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Contact us</h3>
              <p>
                <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
              </p>
            </div>
            
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 <span>FlowithMusic</span>. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}