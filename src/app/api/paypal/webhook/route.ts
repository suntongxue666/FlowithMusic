import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PayPal Webhook ID for verification (optional but recommended)
const WEBHOOK_ID = '1U126713E88513036'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const eventType = body.event_type
    const resource = body.resource

    console.log(`✉️ PayPal Webhook Received: ${eventType}`, body.id)

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionChange(resource, true)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        // Note: We usually don't remove premium immediately on cancel, 
        // we let it run until premium_until. But we can log it.
        console.log(`ℹ️ Subscription ${resource.id} status changed to ${resource.status}`)
        break

      case 'PAYMENT.SALE.COMPLETED':
        // This is the most important one! Every month this fires when money is taken.
        await handlePaymentCompleted(resource)
        break

      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        await handlePaymentReversed(resource)
        break

      default:
        console.log(`🤷 Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('❌ Webhook Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

/**
 * Handle subscription renewal or activation
 */
async function handleSubscriptionChange(resource: any, isActive: boolean) {
  const subscriptionId = resource.id
  const status = resource.status
  const planId = resource.plan_id
  
  // Try to find user by metadata.last_subscription_id
  const { data: users, error } = await supabase
    .from('users')
    .select('id, metadata')
    .contains('metadata', { last_subscription_id: subscriptionId })

  if (error || !users || users.length === 0) {
    console.error(`👤 User not found for subscription: ${subscriptionId}`)
    return
  }

  const user = users[0]
  
  // Calculate expiry (1 month or 1 year)
  const isAnnual = planId === 'P-6BK56971245341456NG3N6KQ'
  const nextExpiry = new Date()
  if (isAnnual) nextExpiry.setFullYear(nextExpiry.getFullYear() + 1)
  else nextExpiry.setMonth(nextExpiry.getMonth() + 1)

  await supabase
    .from('users')
    .update({
      is_premium: isActive && (status === 'ACTIVE'),
      premium_until: nextExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  console.log(`✅ User ${user.id} premium status updated via subscription change`)
}

/**
 * Handle recurring payments
 */
async function handlePaymentCompleted(resource: any) {
  const subscriptionId = resource.billing_agreement_id
  if (!subscriptionId) return

  const { data: users } = await supabase
    .from('users')
    .select('id, premium_until, metadata')
    .contains('metadata', { last_subscription_id: subscriptionId })

  if (users && users.length > 0) {
    const user = users[0]
    const currentExpiry = user.premium_until ? new Date(user.premium_until) : new Date()
    
    // Extend from current expiry or now, whichever is later
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
    const isAnnual = user.metadata?.last_plan === 'yearly'
    
    if (isAnnual) baseDate.setFullYear(baseDate.getFullYear() + 1)
    else baseDate.setMonth(baseDate.getMonth() + 1)

    await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_until: baseDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    console.log(`💰 Payment completed for subscription ${subscriptionId}. Expiry extended to ${baseDate.toISOString()}`)
  }
}

/**
 * Handle refunds/reversals
 */
async function handlePaymentReversed(resource: any) {
  const subscriptionId = resource.billing_agreement_id
  if (!subscriptionId) return

  await supabase
    .from('users')
    .update({
      is_premium: false,
      updated_at: new Date().toISOString()
    })
    .match({ 'metadata->last_subscription_id': subscriptionId }) // Simplified match

  console.log(`⚠️ Payment reversed for subscription ${subscriptionId}. Premium revoked.`)
}
