'use client'

import Link from 'next/link'
import { useState } from 'react'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <header>
      <Link href="/" className="logo">
        <img 
          src="https://ciwjjfcuhubjydajazkk.supabase.co/storage/v1/object/public/webstie-icon//FlowtithMusic-100.png" 
          alt="FlowithMusic" 
          width={36} 
          height={36}
        />
        <span style={{ fontSize: '28px' }}>FlowithMusic</span>
      </Link>
      
      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        <Link href="/" className={currentPage === 'home' ? 'active' : ''}>Home</Link>
        <Link href="/send" className={currentPage === 'send' ? 'active' : ''}>Send</Link>
        <Link href="/explore" className={currentPage === 'explore' ? 'active' : ''}>Explore</Link>
        <Link href="/history" className={currentPage === 'history' ? 'active' : ''}>History</Link>
      </nav>

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Mobile Navigation */}
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}>
        <Link href="/" className={currentPage === 'home' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
        <Link href="/send" className={currentPage === 'send' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Send</Link>
        <Link href="/explore" className={currentPage === 'explore' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Explore</Link>
        <Link href="/history" className={currentPage === 'history' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>History</Link>
      </nav>
    </header>
  )
}