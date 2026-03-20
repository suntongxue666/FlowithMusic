'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { userService } from '@/lib/userService'
import { useUserState } from '@/hooks/useUserState'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  // 使用统一的用户状态管理
  const { user, isAuthenticated, isLoading: globalLoading, signOut: globalSignOut } = useUserState()
  
  // 合并全局loading和本地loading状态
  const loading = globalLoading || localLoading

  // Fetch unread notifications
  useEffect(() => {
    async function fetchUnreadCount() {
      const queryId = user?.id || (typeof window !== 'undefined' ? userService.getAnonymousId() : null);
      if (!queryId || !supabase) return
      
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', queryId)
          .eq('is_read', false)
          
        if (!error && count !== null) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error('Failed to fetch unread notifications', err)
      }
    }
    
    fetchUnreadCount()
    
    const handleRead = () => setUnreadCount(0)
    window.addEventListener('notificationsRead', handleRead)
    return () => window.removeEventListener('notificationsRead', handleRead)
  }, [user, isAuthenticated])

  const handleSignIn = async () => {
    try {
      console.log('🔗 Header: 开始Google OAuth登录...')
      setLocalLoading(true)
      
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
      setLocalLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      console.log('🚪 Header: 开始用户登出流程')
      
      // 使用统一的登出方法
      await globalSignOut()
      console.log('✅ Header: 统一登出完成')
      
      // 刷新页面以确保状态清除
      setTimeout(() => {
        window.location.reload()
      }, 500)
      
    } catch (error: any) {
      console.error('💥 Header: 登出失败:', error)
      alert(`登出失败: ${error.message || '未知错误'}`)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
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
          
          {/* Notifications Tab */}
          <Link href="/notifications" className={currentPage === 'notifications' ? 'active' : ''} style={{ position: 'relative' }}>
            Notifications
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </Link>

          {/* Ko-fi Button - Desktop */}
          <a href='https://ko-fi.com/U7U01GL6A8' target='_blank' rel='noopener noreferrer' style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            <img height='32' style={{ border: '0px', height: '32px' }} src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' alt='Buy Me a Coffee at ko-fi.com' />
          </a>
          
          {/* 登录状态显示 */}
          <div className="auth-section">
            {loading ? (
              <div className="loading-indicator">Loading...</div>
            ) : isAuthenticated && user && user.email ? (
                <Link href={`/user/${user.id}`} className="user-avatar-btn" style={{ position: 'relative', marginTop: '12px' }}>
                  {user.id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981' || (user as any).is_admin ? (
                    <span className="admin-badge">🤹‍♂️</span>
                  ) : user.is_premium || (user as any).is_admin ? (
                    <span className="premium-crown-badge">👑</span>
                  ) : null}
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt="User Avatar" 
                    className="user-avatar" 
                    style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '50%' }} 
                  />
                ) : (
                  <div className="avatar-placeholder-small" style={{ width: '36px', height: '36px' }}>
                    {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
              </Link>
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
            <Link href={`/user/${user.id}`} className="mobile-user-avatar-btn" style={{ position: 'relative', marginTop: '12px' }}>
              {user.id === 'a2a0c0dc-0937-4f15-8796-6ba39fcfa981' || (user as any).is_admin ? (
                <span className="admin-badge">🤹‍♂️</span>
              ) : user.is_premium ? (
                <span className="premium-crown-badge">👑</span>
              ) : null}
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt="User Avatar" 
                  className="mobile-user-avatar" 
                  style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '50%' }} 
                />
              ) : (
                <div className="mobile-avatar-placeholder" style={{ width: '36px', height: '36px' }}>
                  {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
            </Link>
          )}
          
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            style={{ position: 'relative' }}
          >
            <span></span>
            <span></span>
            <span></span>
            {unreadCount > 0 && (
              <span className="mobile-menu-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}>
          <Link href="/" className={currentPage === 'home' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/send" className={currentPage === 'send' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Send</Link>
          <Link href="/explore" className={currentPage === 'explore' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>Explore</Link>
          <Link href="/history" className={currentPage === 'history' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>History</Link>
          
          {/* Notifications Tab */}
          <Link href="/notifications" className={currentPage === 'notifications' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Notifications
            {unreadCount > 0 && (
               <span className="mobile-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </Link>
          
          {/* 移动端登录状态 - 直接作为菜单项避免多余间距 */}
          {!isAuthenticated && !loading && (
            <div className="mobile-sign-in-wrapper border-t border-gray-100 mt-2 pt-2">
              <button className="mobile-sign-in-btn" onClick={() => { handleSignIn(); setIsMobileMenuOpen(false); }} disabled={loading}>
                Sign in
              </button>
            </div>
          )}
        </nav>
      </header>

      <style jsx>{`
        .auth-section {
          display: flex;
          align-items: center;
          margin-left: 20px;
          height: 100%;
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
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
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

          .notification-badge {
            position: absolute;
            top: 18px;
            right: -14px;
            background-color: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border-radius: 9px;
            line-height: 1;
            z-index: 10;
            box-shadow: 0 0 0 2px white;
          }

          .mobile-notification-badge {
            background-color: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 9999px;
            line-height: 1;
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

          .admin-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            font-size: 14px;
            z-index: 5;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }

          .premium-crown-badge {
            position: absolute;
            top: -10px;
            right: -8px;
            font-size: 14px;
            z-index: 5;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            transform: rotate(45deg);
          }

          .mobile-menu-notification-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background-color: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            min-width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border-radius: 8px;
            line-height: 1;
            z-index: 10;
            box-shadow: 0 0 0 1.5px white;
          }
        `}</style>
    </>
  )
}