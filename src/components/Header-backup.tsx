'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import UserProfileModal from './UserProfileModal'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔍 Header: 开始检查认证状态...')
      
      try {
        // 检查Supabase是否可用
        const { supabaseClient: supabase } = await import('@/lib/supabase-direct')
        if (!supabase) {
          console.log('❌ Header: Supabase不可用')
          setIsAuthenticated(false)
          setUser(null)
          return
        }

        console.log('✅ Header: Supabase已加载')

        // 获取当前用户会话
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('❌ Header: 获取用户会话出错:', error)
          setIsAuthenticated(false)
          setUser(null)
          return
        }

        if (currentUser) {
          console.log('✅ Header: 找到Supabase用户会话:', {
            id: currentUser.id,
            email: currentUser.email,
            user_metadata: currentUser.user_metadata
          })
          
          // 从userService获取完整用户信息
          const userServiceUser = userService.getCurrentUser()
          console.log('🔍 Header: UserService用户信息:', userServiceUser)
          
          if (userServiceUser) {
            console.log('✅ Header: 使用UserService用户信息')
            setUser(userServiceUser)
            setIsAuthenticated(true)
          } else {
            console.log('⚠️ Header: UserService无用户信息，使用Supabase用户信息')
            // 如果userService中没有用户信息，使用Supabase的用户信息
            const userData = {
              email: currentUser.email,
              display_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
              avatar_url: currentUser.user_metadata?.avatar_url,
              google_id: currentUser.id
            }
            console.log('📝 Header: 构建的用户数据:', userData)
            setUser(userData)
            setIsAuthenticated(true)
          }
        } else {
          console.log('❌ Header: 未找到用户会话')
          setIsAuthenticated(false)
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Header: 检查认证状态出错:', error)
        setIsAuthenticated(false)
        setUser(null)
      }

      console.log('📊 Header: 最终状态 - isAuthenticated:', isAuthenticated, 'user:', user)
    }

    checkAuthStatus()
    
    // 监听认证状态变化
    const checkInterval = setInterval(checkAuthStatus, 3000)
    
    return () => clearInterval(checkInterval)
  }, [])

  const handleSignIn = () => {
    userService.signInWithGoogle()
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleUserModal = () => {
    setIsUserModalOpen(!isUserModalOpen)
  }

  return (
    <>
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
          
          {/* 登录状态显示 */}
          <div className="auth-section">
            {isAuthenticated && user ? (
              <button className="user-avatar-btn" onClick={toggleUserModal}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="User Avatar" className="user-avatar" />
                ) : (
                  <div className="avatar-placeholder-small">
                    {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
              </button>
            ) : (
              <button className="sign-in-btn" onClick={handleSignIn}>
                Sign in
              </button>
            )}
          </div>
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
          
          {/* 移动端登录状态 */}
          <div className="mobile-auth-section">
            {isAuthenticated && user ? (
              <button className="mobile-user-info" onClick={() => { toggleUserModal(); setIsMobileMenuOpen(false); }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="User Avatar" className="user-avatar" />
                ) : (
                  <div className="avatar-placeholder-small">
                    {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <span>{user.display_name || user.email}</span>
              </button>
            ) : (
              <button className="mobile-sign-in-btn" onClick={() => { handleSignIn(); setIsMobileMenuOpen(false); }}>
                Sign in
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={user || {}}
      />

      <style jsx>{`
        .auth-section {
          display: flex;
          align-items: center;
          margin-left: 20px;
        }

        .sign-in-btn {
          width: 64px;
          height: 24px;
          padding: 0;
          background-color: transparent;
          color: black;
          border: 1px solid black;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sign-in-btn:hover {
          background-color: black;
          color: white;
        }

        .user-avatar-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }

        .user-avatar-btn:hover {
          opacity: 0.8;
        }

        .user-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .avatar-placeholder-small {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .mobile-auth-section {
          padding-top: 20px;
          margin-top: 20px;
          border-top: 1px solid #eee;
        }

        .mobile-sign-in-btn {
          width: 100%;
          padding: 12px;
          background-color: transparent;
          color: black;
          border: 1px solid black;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-sign-in-btn:hover {
          background-color: black;
          color: white;
        }

        .mobile-user-info {
          width: 100%;
          padding: 12px;
          background-color: transparent;
          border: 1px solid #eee;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .mobile-user-info:hover {
          background-color: #f5f5f5;
        }

        .mobile-user-info span {
          font-size: 14px;
          color: #333;
        }

        @media (max-width: 768px) {
          .auth-section {
            display: none;
          }
        }

        @media (min-width: 769px) {
          .mobile-auth-section {
            display: none;
          }
        }
      `}</style>
    </>
  )
}