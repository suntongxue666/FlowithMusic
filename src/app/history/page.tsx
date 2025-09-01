'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { letterService } from '@/lib/letterService'
import { userService } from '@/lib/userService'
import { Letter } from '@/lib/supabase'
import { useUserState } from '@/hooks/useUserState'

export default function HistoryPage() {
  const router = useRouter()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  
  // 使用统一的用户状态管理
  const { user, isAuthenticated, isLoading: userLoading } = useUserState()

  // 调试信息收集
  const getDebugInfo = () => {
    const user = userService.getCurrentUser()
    const isAuth = userService.isAuthenticated()
    const anonymousId = userService.getAnonymousId()
    const allLetters = JSON.parse(localStorage.getItem('letters') || '[]')
    
    return {
      用户服务状态: {
        当前用户: user ? {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          anonymous_id: user.anonymous_id
        } : null,
        认证状态: isAuth,
        匿名ID: anonymousId
      },
      localStorage数据: {
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        anonymous_id: localStorage.getItem('anonymous_id'),
        letters数量: allLetters.length,
        letters详情: allLetters.map((letter: any) => ({
          linkId: letter.link_id,
          recipient: letter.recipient_name,
          created: letter.created_at,
          userId: letter.user_id,
          anonymousId: letter.anonymous_id
        }))
      },
      组件状态: {
        user: user,
        isAuthenticated: isAuthenticated,
        letters数量: letters.length
      }
    }
  }

  // 紧急数据恢复
  const handleEmergencyRecover = async () => {
    setIsRecovering(true)
    try {
      console.log('🚨 用户触发紧急数据恢复...')
      const recoveredLetters = await letterService.emergencyRecoverLetters()
      setLetters(recoveredLetters)
      
      // 刷新用户状态 - 由useUserState Hook自动管理
      await userService.initializeUser()
      // 用户状态会通过useUserState Hook自动更新，无需手动设置
      
      console.log('✅ 数据恢复完成，找回Letters:', recoveredLetters.length)
      alert(`数据恢复完成！找回了 ${recoveredLetters.length} 个Letters`)
      setShowRecoveryModal(false)
    } catch (error) {
      console.error('💥 数据恢复失败:', error)
      alert('数据恢复失败，请刷新页面重试')
    } finally {
      setIsRecovering(false)
    }
  }

  useEffect(() => {
    const loadLettersAndUser = async () => {
      try {
        setLoading(true)
        
        // 等待用户状态稳定，避免竞态条件
        if (userLoading) {
          console.log('⏳ 用户状态还在加载中，等待稳定...')
          return
        }
        
        console.log('📊 History用户状态:', {
          isAuth: isAuthenticated,
          user: user?.email,
          userId: user?.id,
          hasUser: !!user,
          userLoading
        })
        
        // Load letters based on authentication status
        let userLetters: Letter[] = []
        
        if (isAuthenticated && user) {
          // Authenticated user - get from database and migrate if needed
          console.log('🔐 Authenticated user detected, calling getUserLetters...')
          try {
            // 优化超时保护，减少等待时间，优先显示数据
            const lettersPromise = letterService.getUserLetters(50, 0)
            const timeoutPromise = new Promise<Letter[]>((_, reject) => 
              setTimeout(() => reject(new Error('获取Letters超时')), 4000) // 减少到4秒
            )
            
            userLetters = await Promise.race([lettersPromise, timeoutPromise])
            console.log(`✅ Loaded ${userLetters.length} letters for authenticated user:`, 
              userLetters.map(l => ({
                linkId: l.link_id,
                recipient: l.recipient_name,
                created: l.created_at
              }))
            )
          } catch (error) {
            console.warn('❌ Failed to load from database, falling back to localStorage:', error)
            // 优化的localStorage fallback - 确保已登录用户能看到所有相关letters
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            console.log('📱 Fallback: found letters in localStorage:', localLetters.length)
            
            // 为已登录用户过滤相关的letters
            const relevantLetters = localLetters.filter((letter: any) => {
              if (user?.id) {
                // 匹配user_id或anonymous_id的letters
                return letter.user_id === user.id || 
                       (user.anonymous_id && letter.anonymous_id === user.anonymous_id) ||
                       (!letter.user_id && letter.anonymous_id === user.anonymous_id)
              }
              return false
            })
            
            console.log(`📋 Filtered ${relevantLetters.length} relevant letters for user ${user?.email}`)
            
            userLetters = relevantLetters.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          }
        } else {
          // 检查是否是用户状态还未同步的情况
          const localUser = localStorage.getItem('user')
          const localAuth = localStorage.getItem('isAuthenticated')
          
          if (localUser && localAuth === 'true') {
            console.log('🔄 检测到localStorage中有用户数据，但Hook状态未同步，强制使用用户模式')
            const parsedUser = JSON.parse(localUser)
            
            // 使用localStorage中的用户数据获取letters
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            userLetters = localLetters.filter((letter: any) => {
              return letter.user_id === parsedUser.id || 
                     (parsedUser.anonymous_id && letter.anonymous_id === parsedUser.anonymous_id)
            })
            
            console.log(`📋 使用localStorage用户数据，找到${userLetters.length}个letters`)
            
          } else {
            // Anonymous user - get from localStorage only
            console.log('👤 Anonymous user detected, checking localStorage...')
            const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
            const anonymousId = userService.getAnonymousId()
            
            console.log('👤 Anonymous user data:', {
              anonymousId,
              totalLocalLetters: localLetters.length,
              localLettersDetails: localLetters.map((l: any) => ({
                linkId: l.link_id,
                anonymousId: l.anonymous_id,
                userId: l.user_id,
                recipient: l.recipient_name,
                created: l.created_at
              }))
            })
            
            // Filter by anonymous ID if available
            if (anonymousId) {
              userLetters = localLetters.filter((letter: any) => 
                letter.anonymous_id === anonymousId
              )
              console.log(`👤 Filtered ${userLetters.length} letters for anonymous ID: ${anonymousId}`)
              
              // 如果当前匿名ID没有找到Letter，但localStorage中有Letter，可能是匿名ID变化了
              if (userLetters.length === 0 && localLetters.length > 0) {
                console.warn('⚠️ 匿名ID不匹配，检查是否有其他匿名Letter...')
                const anonymousLetters = localLetters.filter((letter: any) => 
                  letter.anonymous_id && !letter.user_id
                )
                
                if (anonymousLetters.length > 0) {
                  console.log('🔄 找到其他匿名Letter，显示所有匿名Letter以恢复数据')
                  userLetters = anonymousLetters
                  
                  // 更新这些Letter的匿名ID为当前ID，以便后续正常工作
                  const updatedLetters = localLetters.map((letter: any) => {
                    if (letter.anonymous_id && !letter.user_id) {
                      return { ...letter, anonymous_id: anonymousId }
                    }
                    return letter
                  })
                  localStorage.setItem('letters', JSON.stringify(updatedLetters))
                  console.log('✅ 已更新匿名Letter的ID为当前匿名ID')
                }
              }
            } else {
              // Show all local letters if no anonymous ID
              userLetters = localLetters
              console.log('👤 No anonymous ID, showing all local letters:', userLetters.length)
            }
            
            userLetters = userLetters.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            
            console.log(`📋 Final anonymous user letters:`, userLetters.length)
          }
        }
        
        setLetters(userLetters)

        
        // Check for login success callback
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('login') === 'success') {
          console.log('History: Login successful, showing toast and refreshing user state')
          setShowToast(true)
          
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Trigger letter migration for newly logged in user with enhanced user state refresh
          setTimeout(async () => {
            try {
              // 用户状态由统一的Hook管理，不需要手动更新
              console.log('🔄 History: 登录成功，用户状态将自动更新')
              
              // 重新加载Letters
              const updatedLetters = await letterService.getUserLetters(50, 0)
              setLetters(updatedLetters)
              console.log('History: Updated letters after login migration')
            } catch (error) {
              console.warn('History: Failed to reload user state and letters after migration:', error)
            }
          }, 1500)
        }
        
      } catch (error) {
        console.error('Failed to initialize History page:', error)
        
        // Final fallback - just show localStorage contents
        const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
        const sortedLetters = localLetters.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setLetters(sortedLetters)
        
      } finally {
        setLoading(false)
      }
    }

    loadLettersAndUser()
  }, [user, isAuthenticated, userLoading]) // 依赖统一的用户状态，避免竞态条件

  const handleLetterClick = (linkId: string) => {
    router.push(`/letter/${linkId}`)
  }

  const handleToastClose = () => {
    setShowToast(false)
  }

  const handleSignIn = async () => {
    try {
      console.log('🔗 HistoryPage: 开始登录...')
      await userService.signInWithGoogle()
    } catch (error: any) {
      console.error('💥 HistoryPage: 登录失败:', error)
      alert(`登录失败: ${error.message}`)
    }
  }

  const copyToClipboard = (linkId: string) => {
    const url = `${window.location.origin}/letter/${linkId}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
    })
  }

  return (
    <main>
      <Header currentPage="history" />
      <div className="history-container">
        {/* Sign in section at top - 只在未登录时显示 */}
        {!isAuthenticated && (
          <div className="signin-section">
            <div className="user-avatar">
              <div className="default-avatar">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="39" fill="white" stroke="#ccc" strokeWidth="2"/>
                  <circle cx="40" cy="32" r="12" fill="none" stroke="#999" strokeWidth="2"/>
                  <path d="M20 65c0-11 9-20 20-20s20 9 20 20" fill="none" stroke="#999" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            
            <button className="google-signin-btn" onClick={handleSignIn}>
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            <p className="signin-description">
              Sign in to save your special Messages — the words and music that connect hearts.
            </p>
          </div>
        )}

        {/* 只在已登录时显示标题 */}
        {isAuthenticated && (
          <div className="history-header">
            <h1>Your Message History</h1>
            {letters.length > 0 && (
              <div className="data-source-info">
                <small style={{ color: '#666', fontSize: '12px' }}>
                  {letters.some(l => l.id && typeof l.id === 'string' && l.id.includes('-')) 
                    ? '📡 从数据库加载' 
                    : '💾 从本地缓存加载'}
                </small>
              </div>
            )}
          </div>
        )}

        {showDebugInfo && (
          <div className="debug-panel">
            <h3>🔍 状态调试信息</h3>
            <pre>{JSON.stringify(getDebugInfo(), null, 2)}</pre>
            <div className="debug-actions">
              <button 
                className="sync-btn"
                onClick={async () => {
                  console.log('🔄 手动同步用户状态...')
                  await userService.initializeUser()
                  // 用户状态会通过useUserState Hook自动更新
                  console.log('✅ 状态同步完成')
                }}
              >
                🔄 同步状态
              </button>
              <button 
                className="clear-btn"
                onClick={() => {
                  localStorage.removeItem('user')
                  localStorage.removeItem('isAuthenticated')
                  localStorage.removeItem('anonymous_id')
                  console.log('🧹 已清除用户数据')
                  window.location.reload()
                }}
              >
                🧹 清除数据
              </button>
              <button 
                className="force-signout-btn"
                onClick={() => {
                  userService.forceSignOut()
                  window.location.reload()
                }}
              >
                🚪 强制退出
              </button>
              <button 
                className="show-all-letters-btn"
                onClick={() => {
                  // 永久设置显示全部letters的标记
                  localStorage.setItem('force_show_all_letters', 'true')
                  console.log('📋 设置永久显示全部Letters标记')
                  
                  const allLetters = JSON.parse(localStorage.getItem('letters') || '[]')
                  console.log('📋 显示所有localStorage中的Letters:', allLetters.length)
                  const sortedLetters = allLetters.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  setLetters(sortedLetters)
                }}
              >
                📋 永久显示全部
              </button>
              <button 
                className="sync-data-btn"
                onClick={async () => {
                  console.log('🔄 开始数据同步...')
                  
                  // 清除所有可能的限制标记
                  localStorage.removeItem('letters_recovered')
                  localStorage.removeItem('supabase_auth_error')
                  localStorage.removeItem('force_show_all_letters')
                  localStorage.removeItem('last_db_timeout') // 清除超时标记
                  
                  // 重新初始化用户状态
                  await userService.initializeUser()
                  // 用户状态会通过useUserState Hook自动更新
                  
                  console.log('✅ 数据同步完成，将重新从数据库加载')
                  window.location.reload()
                }}
              >
                🔄 同步数据库
              </button>
              <button 
                className="emergency-mode-btn"
                onClick={() => {
                  console.log('🚨 启用紧急模式，清除数据库超时标记')
                  localStorage.removeItem('last_db_timeout')
                  localStorage.removeItem('supabase_auth_error')
                  
                  // 强制显示localStorage中的所有letters
                  const allLetters = JSON.parse(localStorage.getItem('letters') || '[]')
                  const sortedLetters = allLetters.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  setLetters(sortedLetters)
                  
                  console.log('✅ 紧急模式已启用，显示所有localStorage letters:', sortedLetters.length)
                }}
              >
                🚨 紧急模式
              </button>
              <button 
                className="fix-sunwei-btn"
                onClick={() => {
                  console.log('🔧 修复Sunwei用户状态同步问题...')
                  
                  // 强制从localStorage恢复用户状态和letters
                  const localUser = localStorage.getItem('user')
                  const localAuth = localStorage.getItem('isAuthenticated')
                  const allLetters = JSON.parse(localStorage.getItem('letters') || '[]')
                  
                  if (localUser && localAuth === 'true') {
                    const parsedUser = JSON.parse(localUser)
                    console.log('🔧 强制使用localStorage用户:', parsedUser.email)
                    
                    // 过滤用户的letters
                    const userLetters = allLetters.filter((letter: any) => {
                      return letter.user_id === parsedUser.id || 
                             (parsedUser.anonymous_id && letter.anonymous_id === parsedUser.anonymous_id)
                    })
                    
                    console.log(`🔧 找到${userLetters.length}个用户letters`)
                    
                    // 立即显示letters
                    const sortedLetters = userLetters.sort((a: any, b: any) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    setLetters(sortedLetters)
                    
                    // 清除可能的错误标记
                    localStorage.removeItem('last_db_timeout')
                    localStorage.removeItem('supabase_auth_error')
                    
                    console.log('✅ Sunwei用户状态修复完成')
                    alert(`修复完成！显示了${sortedLetters.length}个letters`)
                  } else {
                    console.log('❌ localStorage中没有用户数据')
                    alert('localStorage中没有找到用户数据')
                  }
                }}
              >
                🔧 修复Sunwei
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your letters...</p>
          </div>
        ) : letters.length === 0 && isAuthenticated ? (
          <div className="empty-state">
            <h3>No letters yet</h3>
            <p>You haven't created any musical letters yet.</p>
            <button onClick={() => router.push('/send')} className="create-first-btn">
              Create Your First Letter
            </button>
          </div>
        ) : (
          <div className="letters-list">
            {letters.map((letter) => (
              <div key={letter.id} className="letter-item">
                <div className="letter-content" onClick={() => handleLetterClick(letter.link_id)}>
                  <img src={letter.song_album_cover} alt={letter.song_title} className="album-cover" />
                  <div className="letter-details">
                    <h3>To: {letter.recipient_name}</h3>
                    <p className="song-info">{letter.song_title} - {letter.song_artist}</p>
                    <p className="date">{new Date(letter.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
                <div className="letter-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => handleLetterClick(letter.link_id)}
                  >
                    View
                  </button>
                  <button 
                    className="action-btn copy-btn"
                    onClick={() => copyToClipboard(letter.link_id)}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showToast && (
        <Toast 
          message="登录成功！欢迎使用FlowithMusic" 
          isVisible={showToast}
          onClose={handleToastClose}
        />
      )}

      {/* 数据恢复模态框 */}
      {showRecoveryModal && (
        <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <h3>🔄 数据恢复</h3>
              <p>检测到您的Letters可能丢失了。我们可以尝试从数据库和本地存储中恢复您的数据。</p>
              <p><strong>这个操作将：</strong></p>
              <ul>
                <li>从数据库中查找您的所有Letters</li>
                <li>合并本地存储的数据</li>
                <li>清除可能损坏的缓存</li>
                <li>重新同步用户状态</li>
              </ul>
              
              <div className="modal-buttons">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowRecoveryModal(false)}
                  disabled={isRecovering}
                >
                  取消
                </button>
                <button 
                  className="recover-btn"
                  onClick={handleEmergencyRecover}
                  disabled={isRecovering}
                >
                  {isRecovering ? '恢复中...' : '开始恢复'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .history-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
          min-height: calc(100vh - 80px);
        }

        .signin-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 2rem 0;
        }

        .user-avatar {
          margin-bottom: 1.5rem;
        }

        .avatar-image {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          background: white;
          border: 2px solid #ccc;
        }

        .default-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .google-signin-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #4285f4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }

        .google-signin-btn:hover {
          background: #3367d6;
          transform: translateY(-1px);
        }

        .google-icon {
          flex-shrink: 0;
        }

        .signin-description {
          text-align: center;
          color: #666;
          width: auto;
          max-width: 90%;
          line-height: 1.5;
          margin: 0 auto;
          white-space: nowrap;
        }

        .history-header {
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .history-header h1 {
          font-size: 2rem;
          margin: 0;
          color: #333;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .recovery-btn, .debug-btn {
          background: #ff6b35;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .debug-btn {
          background: #333;
        }

        .recovery-btn:hover {
          background: #e55a2b;
          transform: translateY(-1px);
        }

        .debug-btn:hover {
          background: #555;
          transform: translateY(-1px);
        }

        .debug-panel {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          font-family: monospace;
        }

        .debug-panel h3 {
          margin: 0 0 1rem 0;
          color: #495057;
        }

        .debug-panel pre {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 1rem;
          overflow-x: auto;
          font-size: 12px;
          max-height: 300px;
        }

        .debug-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .sync-btn, .clear-btn, .force-signout-btn, .show-all-letters-btn, .sync-data-btn {
          padding: 6px 12px;
          border-radius: 4px;
          border: none;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sync-btn {
          background: #28a745;
          color: white;
        }

        .sync-btn:hover {
          background: #218838;
        }

        .clear-btn {
          background: #dc3545;
          color: white;
        }

        .clear-btn:hover {
          background: #c82333;
        }
        
        .force-signout-btn {
          background: #fd7e14;
          color: white;
        }

        .force-signout-btn:hover {
          background: #e8680e;
        }
        
        .show-all-letters-btn {
          background: #6f42c1;
          color: white;
        }

        .show-all-letters-btn:hover {
          background: #5a379c;
        }
        
        .sync-data-btn {
          background: #17a2b8;
          color: white;
        }

        .sync-data-btn:hover {
          background: #138496;
        }
        
        .emergency-mode-btn {
          background: #dc3545;
          color: white;
        }

        .emergency-mode-btn:hover {
          background: #c82333;
        }
        
        .fix-sunwei-btn {
          background: #ff6b35;
          color: white;
        }

        .fix-sunwei-btn:hover {
          background: #e55a2b;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .recovery-modal {
          background: white;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .modal-content {
          padding: 2rem;
        }

        .modal-content h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.5rem;
        }

        .modal-content p {
          margin: 0 0 1rem 0;
          color: #666;
          line-height: 1.5;
        }

        .modal-content ul {
          margin: 0 0 1.5rem 0;
          padding-left: 1.5rem;
          color: #666;
        }

        .modal-content li {
          margin-bottom: 0.5rem;
        }

        .modal-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .cancel-btn, .recover-btn {
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .cancel-btn {
          background: #f8f9fa;
          color: #666;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #e9ecef;
        }

        .recover-btn {
          background: #ff6b35;
          color: white;
        }

        .recover-btn:hover:not(:disabled) {
          background: #e55a2b;
        }

        .cancel-btn:disabled, .recover-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .create-first-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 1rem;
          transition: transform 0.2s ease;
        }

        .create-first-btn:hover {
          transform: translateY(-2px);
        }

        .letters-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .letter-item {
          display: flex;
          align-items: center;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .letter-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .letter-content {
          display: flex;
          align-items: center;
          flex: 1;
          cursor: pointer;
        }

        @media (min-width: 769px) {
          .letter-content {
            margin-right: 32px;
          }
        }

        .album-cover {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 1rem;
        }

        .letter-details h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .song-info {
          margin: 0 0 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .date {
          margin: 0;
          color: #999;
          font-size: 0.8rem;
        }

        .letter-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn {
          background: #f8f9fa;
          color: #333;
        }

        .view-btn:hover {
          background: #e9ecef;
        }

        .copy-btn {
          background: #333;
          color: white;
        }

        .copy-btn:hover {
          background: #555;
        }

        @media (max-width: 768px) {
          .history-container {
            padding: 1rem;
          }

          .signin-section {
            margin-bottom: 0.75rem;
            padding: 1.5rem 0;
          }

          .history-header h1 {
            font-size: 16px;
          }

          .signin-description {
            white-space: normal;
          }

          .user-avatar {
            margin-bottom: 1rem;
          }

          .avatar-image {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            background: white;
            border: 2px solid #ccc;
          }

          .default-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .default-avatar svg {
            width: 48px;
            height: 48px;
          }

          .letter-item {
            flex-direction: column;
            align-items: stretch;
          }

          .letter-content {
            margin-bottom: 1rem;
          }

          .letter-actions {
            justify-content: stretch;
          }

          .action-btn {
            flex: 1;
          }
        }
      `}</style>
    </main>
  )
}