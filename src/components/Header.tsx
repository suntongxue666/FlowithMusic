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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 Header: 初始化认证状态...')
      
      try {
        // 初始化用户服务
        await userService.initializeUser()
        
        // 检查当前用户状态
        const currentUser = userService.getCurrentUser()
        const isAuth = userService.isAuthenticated()
        
        console.log('👤 Header: 用户状态:', { 
          user: currentUser?.email || currentUser?.display_name || 'Anonymous',
          isAuthenticated: isAuth 
        })
        
        setUser(currentUser)
        setIsAuthenticated(isAuth)
        
        // 检查是否从OAuth回调页面返回
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('login') === 'success') {
          console.log('🎉 Header: 检测到登录成功回调')
          // 刷新用户状态 - 等待一下让状态完全更新
          setTimeout(() => {
            const updatedUser = userService.getCurrentUser()
            const updatedAuth = userService.isAuthenticated()
            
            console.log('🔄 Header: 更新后的用户状态:', {
              user: updatedUser?.email || updatedUser?.display_name,
              avatar: updatedUser?.avatar_url,
              isAuth: updatedAuth
            })
            
            if (updatedUser) {
              setUser(updatedUser)
              setIsAuthenticated(updatedAuth)
            }
          }, 1000)
        }
        
      } catch (error) {
        console.error('❌ Header: 认证初始化失败:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
    
    // 监听存储变化（用于跨标签页同步）
    const handleStorageChange = () => {
      const currentUser = userService.getCurrentUser()
      const isAuth = userService.isAuthenticated()
      setUser(currentUser)
      setIsAuthenticated(isAuth)
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleSignIn = async () => {
    try {
      console.log('🔗 Header: 开始Google OAuth登录...')
      setLoading(true)
      
      // 详细的错误检查
      console.log('🔧 检查Supabase配置...')
      console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('🔧 当前域名:', window.location.origin)
      console.log('🔧 重定向URI:', `${window.location.origin}/auth/callback`)
      
      await userService.signInWithGoogle()
      
    } catch (error: any) {
      console.error('💥 Header: 登录失败:', error)
      console.error('💥 完整错误对象:', error)
      
      // 更详细的错误信息
      let errorMessage = '登录失败，请检查控制台获取详细信息'
      
      if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = '重定向URI不匹配。请检查Google Cloud Console中的重定向URI配置是否包含: ' + window.location.origin + '/auth/callback'
      } else if (error.message?.includes('invalid_client')) {
        errorMessage = '无效的客户端ID。请检查Google OAuth配置'
      } else if (error.message?.includes('Provider not enabled')) {
        errorMessage = 'Google Provider未启用。请在Supabase项目中启用Google认证'
      } else if (error.message) {
        errorMessage = `登录失败: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      console.log('🚪 Header: 用户登出')
      setLoading(true)
      
      await userService.signOut()
      setUser(null)
      setIsAuthenticated(false)
      
      // 刷新页面以清除状态
      window.location.reload()
      
    } catch (error: any) {
      console.error('💥 Header: 登出失败:', error)
    } finally {
      setLoading(false)
    }
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
            {loading ? (
              <div className="loading-indicator">...</div>
            ) : isAuthenticated && user && user.email ? (
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
              <button className="sign-in-btn" onClick={handleSignIn} disabled={loading}>
                {loading ? '...' : 'Sign in'}
              </button>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button and Avatar */}
        <div className="mobile-controls">
          {/* Mobile Avatar - 登录后显示在菜单按钮左侧 */}
          {isAuthenticated && user && user.email && (
            <button className="mobile-user-avatar-btn" onClick={toggleUserModal}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="User Avatar" className="mobile-user-avatar" />
              ) : (
                <div className="mobile-avatar-placeholder">
                  {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
            </button>
          )}
          
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}>
          <Link href="/" className={currentPage === 'home' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/send" className={currentPage === 'send' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Send</Link>
          <Link href="/explore" className={currentPage === 'explore' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Explore</Link>
          <Link href="/history" className={currentPage === 'history' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>History</Link>
          
          {/* 移动端登录状态 */}
          <div className="mobile-auth-section">
            {loading ? (
              <div className="loading-indicator">加载中...</div>
            ) : !isAuthenticated ? (
              <button className="mobile-sign-in-btn" onClick={() => { handleSignIn(); setIsMobileMenuOpen(false); }} disabled={loading}>
                {loading ? '登录中...' : 'Sign in'}
              </button>
            ) : null}
            {/* 登录后不在菜单中显示用户信息，因为已经在顶部栏显示头像 */}
          </div>
        </nav>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={user || {}}
        onSignOut={handleSignOut}
      />

      <style jsx>{`
        .auth-section {
          display: flex;
          align-items: center;
          margin-left: 20px;
        }

        .loading-indicator {
          font-size: 12px;
          color: #666;
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

        .mobile-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mobile-user-avatar-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }

        .mobile-user-avatar-btn:hover {
          opacity: 0.8;
        }

        .mobile-user-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .mobile-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .sign-in-btn:hover:not(:disabled) {
          background-color: black;
          color: white;
        }

        .sign-in-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .user-avatar-btn {
          width: 32px;
          height: 32px;
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
          width: 32px;
          height: 32px;
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

        .mobile-sign-in-btn:hover:not(:disabled) {
          background-color: black;
          color: white;
        }

        .mobile-sign-in-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          
          .mobile-controls {
            display: flex;
          }
        }

        @media (min-width: 769px) {
          .mobile-controls {
            display: none;
          }
          
          .mobile-auth-section {
            display: none;
          }
        }
      `}</style>
    </>
  )
}