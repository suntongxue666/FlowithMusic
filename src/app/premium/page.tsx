'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useUserState } from '@/hooks/useUserState'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

const PAYPAL_CLIENT_ID = 'AQCCWaOGvX92tZI1uf4511x3WG1Hp2obxM4mTNgGX-pnUfObT2bnxfVMRHzSr2zTCycyx6jQtLLRdRx8';
const MONTHLY_PLAN_ID = 'P-0E135132J93420229NG3WTWA';
const ANNUAL_PLAN_ID = 'P-0PU3781769776022HNG3WTWI';

export default function PremiumPage() {
  const router = useRouter()
  const { user } = useUserState()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const benefits = [
    { icon: '✉️', text: 'Unlimited daily letters' },
    { icon: '👥', text: 'View who visited your profile' },
    { icon: '❤️', text: 'View who reacted to your letters' },
    { icon: '🚫', text: 'No ads experience' }
  ]

  const handleSubscriptionSuccess = async (plan: 'monthly' | 'yearly', subscriptionData: any) => {
    try {
      console.log('✅ Subscription successful:', subscriptionData);
      
      const queryId = user?.id || (typeof window !== 'undefined' ? userService.getAnonymousId() : null)
      if (!queryId) throw new Error('User identity not found')

      let targetUserId = user?.id;
      if (!targetUserId && supabase) {
        const { data: existingAnon } = await supabase
          .from('users')
          .select('id')
          .eq('anonymous_id', queryId)
          .maybeSingle();
        
        if (existingAnon) {
          targetUserId = existingAnon.id;
        } else {
          targetUserId = crypto.randomUUID();
        }
      }

      const expiryDate = new Date()
      if (plan === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1)
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      }

      if (!supabase) throw new Error('Database not connected');
      const { error } = await supabase
        .from('users')
        .upsert({
          id: targetUserId,
          anonymous_id: queryId,
          is_premium: true,
          premium_until: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
          metadata: { 
            ...(user?.metadata || {}), 
            last_subscription_id: subscriptionData.subscriptionID,
            last_plan: plan
          }
        }, { onConflict: 'id' })

      if (error) throw error

      setStatus('success')
      
      if (typeof window !== 'undefined' && supabase) {
        const { data: updatedUser } = await supabase.from('users').select('*').eq('id', targetUserId).single();
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          if (!user?.id) localStorage.setItem('isAuthenticated', 'false');
        }
      }

      setTimeout(() => {
        window.location.href = '/user/' + targetUserId;
      }, 3000)
    } catch (err: any) {
      console.error('Failed to update user status:', err)
      setErrorMessage(err.message || 'Payment success but failed to update status.')
      setStatus('error')
    }
  }

  return (
    <PayPalScriptProvider options={{ 
      clientId: PAYPAL_CLIENT_ID,
      vault: true,
      intent: "subscription"
    }}>
      <main className="min-h-screen bg-white px-4">
        <Header currentPage="premium" />
        
        <div className="premium-hero">
          <div className="container mx-auto px-4 py-20 flex flex-col items-center">
            <div className="badge mt-12 mb-6">👑 PREMIUM ACCESS</div>
            <h1 className="hero-title mb-6">Unlock Your Full Experience</h1>
            <p className="hero-subtitle mb-12 max-w-2xl">
              Support FlowithMusic and enjoy unlimited networking, deep interactions, and an ad-free creative space.
            </p>

            {status === 'success' ? (
              <div className="success-container animate-in fade-in zoom-in duration-500">
                <div className="text-6xl mb-6 text-center">✨</div>
                <h2 className="text-3xl font-bold mb-4">Welcome to Premium!</h2>
                <p>Your subscription is active. Redirecting you to your profile...</p>
              </div>
            ) : (
              <div className="pricing-grid">
                {/* Monthly Plan */}
                <div className="pricing-card">
                  <div className="card-header">
                    <h3 className="plan-name">Monthly</h3>
                    <div className="plan-price">$2.99 <span className="price-period">/ month</span></div>
                  </div>
                  <ul className="plan-features">
                    {benefits.map((b, i) => (
                      <li key={i}><span className="check">✓</span> {b.text}</li>
                    ))}
                  </ul>
                  <div className="paypal-button-container">
                    <PayPalButtons 
                      style={{ layout: 'vertical', color: 'black', shape: 'pill', label: 'subscribe' }}
                      createSubscription={(data, actions) => actions.subscription.create({ plan_id: MONTHLY_PLAN_ID })}
                      onApprove={async (data) => await handleSubscriptionSuccess('monthly', data)}
                    />
                  </div>
                </div>

                {/* Yearly Plan */}
                <div className="pricing-card yearly-featured">
                  <div className="popular-badge">MOST POPULAR</div>
                  <div className="card-header">
                    <h3 className="plan-name">Annual</h3>
                    <div className="plan-price">$19.99 <span className="price-period">/ year</span></div>
                    <div className="save-tag">SAVE OVER 40%</div>
                  </div>
                  <ul className="plan-features">
                    {benefits.map((b, i) => (
                      <li key={i}><span className="check">✓</span> {b.text}</li>
                    ))}
                    <li className="extra-feature">✨ Full year of premium support</li>
                  </ul>
                  <div className="paypal-button-container">
                    <PayPalButtons 
                      style={{ layout: 'vertical', color: 'gold', shape: 'pill', label: 'subscribe' }}
                      createSubscription={(data, actions) => actions.subscription.create({ plan_id: ANNUAL_PLAN_ID })}
                      onApprove={async (data) => await handleSubscriptionSuccess('yearly', data)}
                    />
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="error-box mt-8 text-red-500 font-medium">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .premium-hero {
            background: radial-gradient(circle at top, #fafafa 0%, #ffffff 100%);
            min-height: calc(100vh - 80px);
          }
          
          .badge {
            background: #f0f0f0;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #666;
            border: 1px solid #e5e5e5;
          }

          .hero-title {
            font-size: 52px;
            font-weight: 850;
            color: #000;
            letter-spacing: -2px;
            text-align: center;
            line-height: 1.1;
          }

          .hero-subtitle {
            font-size: 20px;
            color: #666;
            text-align: center;
            line-height: 1.5;
          }

          .pricing-grid {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            align-items: stretch;
            gap: 32px;
            width: 100%;
            margin-top: 20px;
            padding-bottom: 48px; /* 底部 48 像素空白 */
          }

          @media (max-width: 880px) {
            .pricing-grid {
              flex-direction: column;
              align-items: center;
            }
          }

          .pricing-card {
            background: #fff;
            border: 1px solid #eef0f3;
            border-radius: 32px;
            padding: 40px;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 420px; /* 宽度约为之前 900px 总宽的一半 */
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }

          .pricing-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border-color: #000;
          }

          .yearly-featured {
            border: 2px solid #000;
            background: #fff;
          }

          .popular-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: #000;
            color: #fff;
            padding: 4px 16px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1px;
          }

          .card-header {
            margin-bottom: 32px;
            text-align: center;
          }

          .plan-name {
            font-size: 18px;
            font-weight: 600;
            color: #666;
            margin-bottom: 8px;
          }

          .plan-price {
            font-size: 48px;
            font-weight: 800;
            color: #000;
            letter-spacing: -2px;
          }

          .price-period {
            font-size: 16px;
            font-weight: 500;
            color: #999;
            letter-spacing: 0;
          }

          .save-tag {
            display: inline-block;
            background: #f0fdf4;
            color: #166534;
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 700;
            margin-top: 12px;
          }

          .plan-features {
            list-style: none;
            padding: 0;
            margin: 0 0 40px 0;
            flex-grow: 1;
          }

          .plan-features li {
            margin-bottom: 16px;
            font-size: 15px;
            color: #444;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .check {
            color: #000;
            font-weight: 900;
          }

          .extra-feature {
            font-weight: 600;
            color: #000 !important;
          }

          .paypal-button-container {
            width: 100%;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .success-container {
            background: #fff;
            border: 1px solid #eef0f3;
            border-radius: 32px;
            padding: 60px;
            text-align: center;
            max-width: 500px;
          }

          @media (max-width: 640px) {
            .hero-title {
              font-size: 36px;
            }
            .pricing-card {
              padding: 24px;
            }
          }
        `}</style>
      </main>
    </PayPalScriptProvider>
  )
}
