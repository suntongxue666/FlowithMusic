'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useUserState } from '@/hooks/useUserState'
import { userService } from '@/lib/userService'
import { supabase } from '@/lib/supabase'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { useEffect } from 'react'
import RecentBuyersMarquee from '@/components/RecentBuyersMarquee'

const PAYPAL_CLIENT_ID = 'AQCCWaOGvX92tZI1uf4511x3WG1Hp2obxM4mTNgGX-pnUfObT2bnxfVMRHzSr2zTCycyx6jQtLLRdRx8';
const MONTHLY_PLAN_ID = 'P-0E135132J93420229NG3WTWA';
const ANNUAL_PLAN_ID = 'P-0PU3781769776022HNG3WTWI';

export default function PremiumPage() {
  const router = useRouter()
  const { user } = useUserState()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [creemLoading, setCreemLoading] = useState<string | null>(null)

  const handleCreemPayment = async (planType: 'monthly' | 'yearly') => {
    try {
      setCreemLoading(planType)
      const queryId = user?.id || (typeof window !== 'undefined' ? userService.getAnonymousId() : null)
      
      const response = await fetch('/api/creem/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planType,
          userId: queryId,
          userEmail: user?.email,
          returnUrl: window.location.origin + window.location.pathname
        })
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (err: any) {
      console.error('Creem payment error:', err)
      alert(err.message || 'Payment initiation failed')
    } finally {
      setCreemLoading(null)
    }
  }

  // Handle redirect success from Creem
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success_creem') {
      setStatus('success')
      // 清除 URL 参数
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Handle redirect success from PayPal One-time
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success_order') {
      setStatus('success')
    }
  }, [])
  
  // Calculate current user ID (for PayPal custom_id)
  const currentUserId = user?.id || (typeof window !== 'undefined' ? userService.getAnonymousId() : null)
  const anonymousId = typeof window !== 'undefined' ? userService.getAnonymousId() : null

  const logPaymentEvent = async (eventType: string, status?: string, details?: any) => {
    try {
      await fetch('/api/payment/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          anonymous_id: anonymousId,
          subscription_id: details?.subscriptionID || details?.id || details?.orderID,
          event_type: eventType,
          status,
          details
        })
      })
    } catch (err) {
      console.warn('Failed to log payment event:', err)
    }
  }

  const benefits = [
    { icon: '✉️', text: 'Unlimited daily letters' },
    { icon: '👥', text: 'View who visited your profile' },
    { icon: '❤️', text: 'View who reacted to your letters' },
    { icon: '🚫', text: <strong>Recipients can view without ads ⭐</strong> }
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
          // Fallback for crypto.randomUUID()
          targetUserId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan)
    setShowPaymentModal(true)
    logPaymentEvent('PLAN_SELECTED', plan.type, { plan: plan.id })
  }

  // Define plans
  const oneTimeMonthly = {
    id: 'onetime_monthly',
    name: '30 Days Pass',
    price: '2.99',
    type: 'onetime',
    description: 'FlowithMusic Premium - 30 Days Pass'
  }

  const oneTimeYearly = {
    id: 'onetime_yearly',
    name: '1 Year Pass',
    price: '19.99',
    type: 'onetime',
    description: 'FlowithMusic Premium - 1 Year Pass'
  }

  const subMonthly = {
    id: 'sub_monthly',
    name: 'Subscription Monthly',
    price: '2.99',
    type: 'subscription',
    planId: MONTHLY_PLAN_ID
  }

  const subYearly = {
    id: 'sub_yearly',
    name: 'Subscription Annual',
    price: '19.99',
    type: 'subscription',
    planId: ANNUAL_PLAN_ID
  }

  return (
    <main className="min-h-screen bg-white px-4">
      <Header currentPage="premium" />
      
      <div className="premium-hero">
          <div className="container mx-auto px-4 py-20 flex flex-col items-center">
            <div className="badge">👑 PREMIUM</div>
            <h1 className="hero-title mb-6">Unlock Your Full Experience</h1>
            <p className="hero-subtitle mb-12 max-w-2xl px-4">
              Enjoy unlimited features and ad-free experience.
            </p>

            {status === 'success' ? (
              <div className="success-container animate-in fade-in zoom-in duration-500">
                <div className="text-6xl mb-6 text-center">✨</div>
                <h2 className="text-3xl font-bold mb-4">Welcome to Premium!</h2>
                <p>Your subscription is active. Redirecting you to your profile...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full max-w-5xl">
                {/* 🟢 一次性买断 Section */}
                <div className="w-full text-center mb-0">
                  <h2 className="section-title text-green-600">⚡ One-time Pass (No Auto-Renewal)</h2>
                  <p className="section-desc">Perfect if you want to pay with <strong>PayPal Balance</strong> or without a credit card.</p>
                </div>

                <div className="pricing-grid onetime-grid">
                  {/* One-time Monthly */}
                  <div className="pricing-card onetime-card">
                    <div className="card-header">
                      <h3 className="plan-name">30 Days Pass</h3>
                      <div className="plan-price">$2.99 <span className="price-period">/ one-time</span></div>
                    </div>
                    <ul className="plan-features">
                      {benefits.map((b, i) => (
                        <li key={i}><span className="check">✓</span> {b.text}</li>
                      ))}
                    </ul>
                    <div className="payment-button-container mt-auto">
                      <div className="mb-2">
                        <RecentBuyersMarquee />
                      </div>
                      <button 
                        onClick={() => handleCreemPayment('monthly')}
                        disabled={creemLoading !== null}
                        className="pay-now-btn creem-btn mb-3"
                      >
                        {creemLoading === 'monthly' ? 'Loading...' : 'Pay with Alipay / WeChat'}
                      </button>
                      <button 
                        onClick={() => handleSelectPlan(oneTimeMonthly)}
                        className="pay-now-btn onetime-btn"
                      >
                        Buy with PayPal
                      </button>
                      <p className="payment-note text-xs text-center text-gray-400" style={{ marginTop: '16px' }}>No auto-renewal</p>
                    </div>
                  </div>
 
                  {/* One-time Annual */}
                  <div className="pricing-card onetime-card yearly-onetime">
                    <div className="save-tag">BEST VALUE</div>
                    <div className="card-header">
                      <h3 className="plan-name">1 Year Pass</h3>
                      <div className="plan-price">$19.99 <span className="price-period">/ one-time</span></div>
                    </div>
                    <ul className="plan-features">
                      {benefits.map((b, i) => (
                        <li key={i}><span className="check">✓</span> {b.text}</li>
                      ))}
                      <li className="extra-feature">✨ Premium support for 1 year</li>
                    </ul>
                    <div className="payment-button-container mt-auto">
                      <div className="mb-2">
                        <RecentBuyersMarquee />
                      </div>
                      <button 
                        onClick={() => handleCreemPayment('yearly')}
                        disabled={creemLoading !== null}
                        className="pay-now-btn creem-btn mb-3"
                      >
                        {creemLoading === 'yearly' ? 'Loading...' : 'Pay with Alipay / WeChat'}
                      </button>
                      <button 
                        onClick={() => handleSelectPlan(oneTimeYearly)}
                        className="pay-now-btn onetime-btn"
                      >
                        Buy with PayPal
                      </button>
                      <p className="payment-note text-center text-xs text-gray-400" style={{ marginTop: '16px' }}>No auto-renewal</p>
                    </div>
                  </div>
                </div>

                <div className="divider my-16">
                  <span className="divider-text">OR CHOOSE AUTOMATIC RENEWAL</span>
                </div>

                {/* 🔄 订阅 Section */}
                <div className="w-full text-center">
                  <h2 className="section-title">🔄 Subscription (Auto-renewal)</h2>
                  <p className="section-desc text-red-500 font-medium">⚠️ Requires a Credit Card or Debit Card linked to PayPal.</p>
                </div>

                <div className="pricing-grid">
                  {/* Monthly Plan */}
                  <div className="pricing-card">
                    <div className="card-header">
                      <h3 className="plan-name">Subscription Monthly</h3>
                      <div className="plan-price">$2.99 <span className="price-period">/ month</span></div>
                    </div>
                    <ul className="plan-features">
                      {benefits.map((b, i) => (
                        <li key={i}><span className="check">✓</span> {b.text}</li>
                      ))}
                    </ul>
                    <div className="payment-button-container mt-auto">
                      <button 
                        onClick={() => handleSelectPlan(subMonthly)}
                        className="pay-now-btn sub-btn"
                      >
                        Subscribe
                      </button>
                    </div>
                  </div>

                  {/* Yearly Plan */}
                  <div className="pricing-card yearly-featured">
                    <div className="popular-badge">MOST VALUE</div>
                    <div className="save-tag">SAVE 40%</div>
                    <div className="card-header">
                      <h3 className="plan-name">Subscription Annual</h3>
                      <div className="plan-price">$19.99 <span className="price-period">/ year</span></div>
                    </div>
                    <ul className="plan-features">
                      {benefits.map((b, i) => (
                        <li key={i}><span className="check">✓</span> {b.text}</li>
                      ))}
                      <li className="extra-feature">✨ Full year of premium support</li>
                    </ul>
                    <div className="payment-button-container mt-auto">
                      <button 
                        onClick={() => handleSelectPlan(subYearly)}
                        className="pay-now-btn sub-btn highlight-btn"
                      >
                        Subscribe
                      </button>
                    </div>
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

        {/* Payment Modal */}
        {showPaymentModal && selectedPlan && (
          <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="payment-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm Your Order</h3>
                <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
              </div>
              
              <div className="order-summary">
                <div className="order-item">
                  <span className="item-name">{selectedPlan.name}</span>
                  <span className="item-price">${selectedPlan.price}</span>
                </div>
                <div className="order-total">
                  <span>Total Due</span>
                  <span className="total-price">${selectedPlan.price}</span>
                </div>
              </div>

              <div className="paypal-container-modal">
                <PayPalScriptProvider 
                  key={selectedPlan.type}
                  options={{ 
                    clientId: PAYPAL_CLIENT_ID, 
                    currency: "USD",
                    vault: selectedPlan.type === 'subscription' ? true : undefined,
                    intent: selectedPlan.type === 'subscription' ? 'subscription' : 'capture'
                  }}
                >
                  <PayPalButtons 
                    key={selectedPlan.id}
                    style={{ layout: 'vertical', color: 'gold', shape: 'pill' }}
                    createOrder={selectedPlan.type === 'onetime' ? (data, actions) => {
                      return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [{
                          amount: { currency_code: "USD", value: selectedPlan.price },
                          description: selectedPlan.description || selectedPlan.name,
                          custom_id: currentUserId || undefined
                        }],
                        application_context: {
                          shipping_preference: "NO_SHIPPING",
                          user_action: "PAY_NOW"
                        }
                      } as any);
                    } : undefined}
                    createSubscription={selectedPlan.type === 'subscription' ? (data, actions) => {
                      return actions.subscription.create({ 
                        plan_id: selectedPlan.planId,
                        custom_id: currentUserId || undefined
                      });
                    } : undefined}
                    onApprove={async (data, actions) => {
                      if (selectedPlan.type === 'onetime') {
                        try {
                          // 使用我们的服务器端 Capture API 以保证可靠性
                          const captureRes = await fetch('/api/paypal/capture', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderID: data.orderID,
                              userId: user?.id,
                              anonymousId: anonymousId,
                              plan: selectedPlan.id,
                              productType: 'premium'
                            })
                          });
                          
                          const captureData = await captureRes.json();
                          
                          if (!captureRes.ok) {
                            throw new Error(captureData.error || 'Failed to capture payment');
                          }

                          setShowPaymentModal(false);
                          await handleSubscriptionSuccess(selectedPlan.id.includes('monthly') ? 'monthly' : 'yearly', { 
                            subscriptionID: data.orderID, 
                            isOrder: true,
                            details: captureData.details
                          });
                        } catch (err: any) {
                          console.error('Capture failed:', err);
                          setShowPaymentModal(false);
                          setErrorMessage(err.message || 'Payment capture failed. Please contact support.');
                          setStatus('error');
                        }
                      } else {
                        setShowPaymentModal(false)
                        await handleSubscriptionSuccess(selectedPlan.id.includes('monthly') ? 'monthly' : 'yearly', data);
                      }
                    }}
                    onCancel={() => setShowPaymentModal(false)}
                    onError={(err) => {
                      setShowPaymentModal(false)
                      setErrorMessage(err.toString())
                      setStatus('error')
                    }}
                  />
                </PayPalScriptProvider>
              </div>

              <p className="secure-text">🔒 Secure payment via PayPal</p>
            </div>
          </div>
        )}

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
            margin-top: 12px;
            margin-bottom: 12px;
          }

          .hero-title {
            font-family: 'Caveat', cursive;
            font-size: 52px;
            font-weight: 500;
            color: #000;
            letter-spacing: -2px;
            text-align: center;
            line-height: 1.1;
            margin-bottom: 1.0rem; /* 改为 2 倍 */
          }

          .hero-subtitle {
            font-size: 18px;
            color: #666;
            text-align: center;
            line-height: 1.5;
            margin-bottom: 3rem;
            max-width: 32rem;
            margin-left: auto;
            margin-right: auto;
          }

          .section-title {
            font-size: 28px;
            font-weight: 800;
            color: #111;
            margin-bottom: 8px;
          }

          .section-desc {
            font-size: 15px;
            color: #666;
            margin-bottom: 24px;
          }

          .divider {
            position: relative;
            width: 100%;
            height: 1px;
            background: #eef0f3;
            margin: 64px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .divider-text {
            background: #fff;
            padding: 0 16px;
            color: #999;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
          }

          .onetime-card {
            background: rgba(34, 197, 94, 0.08) !important;
            border: 2px solid rgba(34, 197, 94, 0.2) !important;
          }

          .onetime-card:hover {
            border-color: rgba(34, 197, 94, 1) !important;
            background: rgba(34, 197, 94, 0.12) !important;
          }

          .yearly-onetime {
            border: 2px solid rgba(34, 197, 94, 0.4) !important;
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
            padding-bottom: 48px;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          @media (max-width: 880px) {
            .pricing-grid {
              flex-direction: column;
              align-items: center;
              padding-left: 0;
              padding-right: 0;
            }
          }

          .pricing-card {
            background: #fff;
            border: 1px solid #eef0f3;
            border-radius: 32px;
            padding: 30px;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 400px;
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
            margin-bottom: 24px;
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
            position: absolute;
            top: 16px;
            right: 16px;
            background: #f0fdf4;
            color: #166534;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
          }

          .plan-features {
            list-style: none;
            padding: 0;
            margin: 0 0 32px 0;
            flex-grow: 1;
          }

          .plan-features li {
            margin-bottom: 11px;
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

          .paypal-mock-button {
            background: #000;
            color: #fff;
            border: none;
            border-radius: 100px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .paypal-mock-button:hover {
            background: #222;
            transform: scale(1.02);
          }

          .paypal-mock-button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
          }

          .paypal-button-container {
            width: 100%;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .payment-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(8px);
          }

          .payment-modal-content {
            background: white;
            padding: 32px;
            border-radius: 24px;
            width: 90%;
            max-width: 440px;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .modal-header h3 {
            font-size: 20px;
            font-weight: 800;
          }

          .close-btn {
            font-size: 28px;
            color: #999;
            cursor: pointer;
            border: none;
            background: none;
          }

          .order-summary {
            background: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .order-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-weight: 500;
            color: #64748b;
          }

          .order-total {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-weight: 800;
            font-size: 18px;
            color: #000;
          }

          .paypal-container-modal {
            min-height: 200px;
          }

          .pay-now-btn {
            background: #000;
            color: #fff;
            border: none;
            border-radius: 100px;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
          }

          .pay-now-btn:hover {
            transform: scale(1.02);
            background: #222;
          }

          .onetime-btn {
            background: #166534;
          }
          
          .onetime-btn:hover {
            background: #14532d;
          }

          .creem-btn {
            background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          }

          .creem-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #6d28d9 0%, #1d4ed8 100%);
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
          }

          .creem-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            background: #94a3b8;
          }

          .highlight-btn {
             box-shadow: 0 4px 14px 0 rgba(0,0,0,0.3);
          }

          .secure-text {
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            margin-top: 20px;
          }

          .success-container {
            background: #fff;
            border: 1px solid #eef0f3;
            border-radius: 32px;
            padding: 60px;
            text-align: center;
            max-width: 500px;
          }

          @media (max-width: 768px) {
            .pricing-card {
              max-width: 360px;
              padding: 24px;
            }
            .hero-title {
              font-size: 36px;
              margin-bottom: 1rem;
            }
            .hero-subtitle {
              font-size: 18px !important;
              padding: 0 1rem;
            }
            .badge {
              margin-top: 1.5rem !important;
              margin-bottom: 1.5rem !important;
            }
          }
        `}</style>
      </main>
    )
}
