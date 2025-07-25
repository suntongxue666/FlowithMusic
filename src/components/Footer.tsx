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
          <div className="footer-section">
            <h3>功能导航</h3>
            <ul>
              <li><Link href="/">首页</Link></li>
              <li><Link href="/send">发送音乐信</Link></li>
              <li><Link href="/history">历史记录</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>联系我们</h3>
            <p>
              <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
            </p>
          </div>
          
          <div className="footer-section">
            <h3>法律条款</h3>
            <ul>
              <li><Link href="/terms">用户协议</Link></li>
              <li><Link href="/privacy">隐私协议</Link></li>
            </ul>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 FlowithMusic. All rights reserved.</p>
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
            <h2>FlowithMusic</h2>
            <p className="footer-tagline">Songs carry your unsaid words — that connects hearts.</p>
          </div>
          
          <div className="footer-sections">
            <div className="footer-section">
              <h3>功能导航</h3>
              <ul>
                <li><Link href="/">首页</Link></li>
                <li><Link href="/send">发送音乐信</Link></li>
                <li><Link href="/history">历史记录</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>网站地图</h3>
              <ul>
                <li><Link href="/">主页</Link></li>
                <li><Link href="/send">创建音乐信</Link></li>
                <li><Link href="/history">我的音乐信</Link></li>
                <li><Link href="/about">关于我们</Link></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>联系我们</h3>
              <p>
                <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
              </p>
            </div>
            
            <div className="footer-section">
              <h3>法律条款</h3>
              <ul>
                <li><Link href="/terms">用户协议</Link></li>
                <li><Link href="/privacy">隐私协议</Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 FlowithMusic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}