'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'

function AuthCallbackComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const handleAuth = async () => {
      console.log('🚀 AuthCallback: Starting Google OAuth callback handling...');

      try {
        if (!supabase) throw new Error('Supabase not initialized');

        // 1. 优先检查 URL 中的 'code' 参数 (PKCE Flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          console.log('🔍 AuthCallback: Found OAuth code, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data.session?.user) {
            console.log('✅ AuthCallback: Code exchanged for user:', data.session.user.email);
            await userService.handleAuthCallback(data.session.user);
            if (mounted) {
              router.push('/history?login=success');
              return;
            }
          }
        }

        // 2. 检查现有会话 (可能适用于 Implicit/Hash flows)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          console.log('✅ AuthCallback: Session found for user:', session.user.email);
          await userService.handleAuthCallback(session.user);
          if (mounted) {
            router.push('/history?login=success');
            return;
          }
        }

        // 3. 兜底方案：监听 AuthStateChange
        console.log('⏳ AuthCallback: No immediate session, waiting for auth state change...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            console.log('✅ AuthCallback: Auth event:', event, 'for:', session.user.email);
            subscription.unsubscribe();
            clearTimeout(timeoutId);

            try {
              await userService.handleAuthCallback(session.user);
              if (mounted) {
                router.push('/history?login=success');
              }
            } catch (err) {
              console.error('💥 AuthCallback: DB sync error:', err);
              if (mounted) {
                setError('Failed to sync user data.');
                setTimeout(() => router.push('/history?login=error'), 3000);
              }
            }
          }
        });

        // 设置 15 秒超时
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          if (mounted) {
            console.error('💥 AuthCallback: Auth state change timeout');
            setError('Verification timeout. Please try logging in again.');
            setTimeout(() => router.push('/history?login=error'), 3000);
          }
        }, 15000);

      } catch (err: any) {
        console.error('💥 AuthCallback: Error:', err);
        if (mounted) {
          setError(err.message || 'Login failed');
          setTimeout(() => router.push('/history?login=error'), 3000);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    handleAuth();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router])

  if (loading) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>Verifying Login...</h2>
          <p>Please wait while we process your Google login information</p>
          <p className="auth-notice">🔐 Establishing secure connection</p>
        </div>

        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          .auth-notice {
            color: #666;
            font-size: 14px;
            margin-top: 1rem;
            font-style: italic;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-callback-container">
        <div className="auth-callback-content error">
          <div className="error-icon">❌</div>
          <h2>Login Failed</h2>
          <p>{error}</p>
          <p>Redirecting to homepage...</p>

          <button onClick={() => router.push('/')} className="retry-btn">
            Back to Home
          </button>
        </div>

        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .error-icon {
            font-size: 48px;
            margin-bottom: 1rem;
          }
          
          .retry-btn {
            margin-top: 1rem;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          
          .retry-btn:hover {
            background-color: #0056b3;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <div className="success-icon">✅</div>
        <h2>Login Successful!</h2>
        <p>Preparing your personalized experience...</p>
        <p>Redirecting to your history page</p>
      </div>

      <style jsx>{`
        .auth-callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
        }
        
        .auth-callback-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
        }
        
        .success-icon {
          font-size: 48px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <div className="loading-spinner"></div>
          <h2>Loading...</h2>
          <p>Please wait while we process your login information</p>
        </div>

        <style jsx>{`
          .auth-callback-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f5f5f5;
          }
          
          .auth-callback-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <AuthCallbackComponent />
    </Suspense>
  )
}