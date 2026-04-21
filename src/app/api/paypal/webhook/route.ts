import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// PayPal Webhook ID for verification (from Vercel env)
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '1GD69000FM652152F'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const eventType = body.event_type
    const resource = body.resource

    // 🚀 新增：记录所有 Webhook 事件到日志表供审计
    await logWebhookEvent(body)

    console.log(`✉️ PayPal Webhook Received: ${eventType}`, {
      id: body.id,
      resource_id: resource.id,
      status: resource.status,
      custom_id: resource.custom_id || resource.custom
    })

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionChange(resource, eventType)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        console.log(`ℹ️ Subscription ${resource.id} status changed to ${resource.status}`)
        await handleSubscriptionChange(resource, eventType)
        break

      case 'PAYMENT.SALE.COMPLETED':
        // This is the most important one! Every month this fires when money is taken.
        await handlePaymentCompleted(resource)
        break

      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        await handlePaymentReversed(resource)
        break

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      case 'PAYMENT.SALE.DENIED':
        console.log(`⚠️ Payment Failed Event: ${eventType}`)
        await handlePaymentFailed(resource, eventType)
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
 * Log webhook events for auditing
 */
async function logWebhookEvent(body: any) {
  const client = supabaseAdmin || supabase
  if (!client) return

  const eventType = body.event_type
  const resource = body.resource
  const subscriptionId = resource.id || resource.billing_agreement_id
  const customId = resource.custom_id || resource.custom

  try {
    await client.from('payment_logs').insert({
      user_id: customId || null,
      subscription_id: subscriptionId || null,
      event_type: `WEBHOOK_${eventType}`,
      status: resource.status || null,
      details: {
        webhook_id: body.id,
        create_time: body.create_time,
        resource: resource
      }
    })
  } catch (err) {
    console.error('❌ Failed to log webhook event:', err)
  }
}

/**
 * Helper to find user by custom_id or subscription_id
 */
async function findUser(resource: any) {
  if (!supabase) return null
  
  const subscriptionId = resource.id || resource.billing_agreement_id
  const customId = resource.custom_id || resource.custom
  
  // 1. Try finding by custom_id (new direct method)
  if (customId) {
    console.log(`🔍 Searching user by custom_id: ${customId}`)
    const client = supabaseAdmin || supabase
    const { data: user } = await client!
      .from('users')
      .select('*')
      .eq('id', customId)
      .maybeSingle()
    
    if (user) return user
  }

  // 2. Fallback to searching metadata for subscription ID (old method)
  if (subscriptionId) {
    console.log(`🔍 Searching user by last_subscription_id: ${subscriptionId}`)
    const client = supabaseAdmin || supabase
    const { data: users } = await client!
      .from('users')
      .select('*')
      .contains('metadata', { last_subscription_id: subscriptionId })
    
    if (users && users.length > 0) return users[0]
  }

  return null
}

/**
 * Handle subscription status changes
 */
async function handleSubscriptionChange(resource: any, eventType: string) {
  const user = await findUser(resource)
  if (!user) {
    console.error(`👤 User not found for ${eventType}: ${resource.id}`)
    return
  }

  const status = resource.status
  const planId = resource.plan_id
  const subscriptionId = resource.id

  // Calculate expiry (1 month or 1 year)
  // Monthly: P-0E135132J93420229NG3WTWA
  // Annual: P-0PU3781769776022HNG3WTWI, P-6BK56971245341456NG3N6KQ (old)
  const isAnnual = planId === 'P-0PU3781769776022HNG3WTWI' || planId === 'P-6BK56971245341456NG3N6KQ'
  const nextExpiry = new Date()
  if (isAnnual) nextExpiry.setFullYear(nextExpiry.getFullYear() + 1)
  else nextExpiry.setMonth(nextExpiry.getMonth() + 1)

  const isActive = status === 'ACTIVE'
  
  const client = supabaseAdmin || supabase
  const { error } = await client!
    .from('users')
    .update({
      is_premium: isActive,
      premium_until: isActive ? nextExpiry.toISOString() : user.premium_until,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(user.metadata || {}),
        last_subscription_id: subscriptionId,
        last_event: eventType,
        last_status: status
      }
    })
    .eq('id', user.id)

  if (error) {
    console.error(`❌ Failed to update user premium status:`, error)
  } else {
    console.log(`✅ User ${user.id} premium status updated to ${isActive} (${status})`)
  }
}

/**
 * Handle recurring payments
 */
async function handlePaymentCompleted(resource: any) {
  const user = await findUser(resource)
  const subscriptionId = resource.billing_agreement_id

  if (!user) {
    console.error(`💰 User not found for payment: ${subscriptionId}`)
    return
  }

  const currentExpiry = user.premium_until ? new Date(user.premium_until) : new Date()
  
  // Extend from current expiry or now, whichever is later
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
  const isAnnual = user.metadata?.last_plan === 'yearly'
  
  if (isAnnual) baseDate.setFullYear(baseDate.getFullYear() + 1)
  else baseDate.setMonth(baseDate.getMonth() + 1)

  const client = supabaseAdmin || supabase
  const { error } = await client!
    .from('users')
    .update({
      is_premium: true,
      premium_until: baseDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error(`❌ Failed to complete payment for subscription ${subscriptionId}:`, error)
  } else {
    console.log(`💰 Payment completed for subscription ${subscriptionId}. User ${user.id} extended to ${baseDate.toISOString()}`)
  }
}

/**
 * Handle refunds/reversals
 */
async function handlePaymentReversed(resource: any) {
  const user = await findUser(resource)
  if (!user) return

  const client = supabaseAdmin || supabase
  const { error } = await client!
    .from('users')
    .update({
      is_premium: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error(`❌ Failed to reverse payment for user ${user.id}:`, error)
  } else {
    console.log(`⚠️ Payment reversed for user ${user.id}. Premium revoked.`)
  }
}

/**
 * Handle payment failures and notify developer via Resend
 */
async function handlePaymentFailed(resource: any, eventType: string) {
  const user = await findUser(resource) || { id: 'Unknown (Not Found)', email: 'Unknown' }
  const subscriptionId = resource.billing_agreement_id || resource.id || 'Unknown'
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ Missing RESEND_API_KEY. Cannot send failure alert email.')
    return
  }

  try {
    const developerEmail = process.env.DEVELOPER_EMAIL || 'tiktreeapp@gmail.com'
    
    await resend.emails.send({
      from: 'Flowith Alerts <onboarding@resend.dev>', // If you have a verified domain, change this
      to: developerEmail,
      subject: `🚨 [PayPal Alert] Payment Failed: ${eventType}`,
      html: `
        <h2>PayPal Payment Failure Detected</h2>
        <p><strong>Event:</strong> ${eventType}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>User Details:</strong> ${JSON.stringify(user)}</p>
        <br/>
        <p>Please check your PayPal merchant dashboard for more details.</p>
      `,
    })
    console.log(`✉️ Alert email sent to ${developerEmail} for failed payment.`)
  } catch (error) {
    console.error('❌ Failed to send Resend email alert:', error)
  }
}
