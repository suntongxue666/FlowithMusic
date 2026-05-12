import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, userEmail, returnUrl } = await request.json()
    
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
    }

    const apiKey = process.env.CREEM_API_KEY
    const creemProductId = planId === 'monthly' 
      ? process.env.CREEM_MONTHLY_PRODUCT_ID 
      : process.env.CREEM_YEARLY_PRODUCT_ID

    if (!apiKey || !creemProductId) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const payload = {
      product_id: creemProductId,
      success_url: `${returnUrl}?status=success_creem`,
      metadata: { userId, plan: planId },
      customer: userEmail ? { email: userEmail } : undefined
    }

    const response = await fetch('https://api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.message || data.error || 'Creem API error',
        details: data 
      }, { status: response.status })
    }

    const checkoutUrl = data.url || data.checkout_url || data.checkoutUrl || data.payment_url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Checkout URL not found' }, { status: 500 })
    }

    // 🚀 Log Creem Checkout Initialization to Supabase
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const validUserId = (userId && isUUID(userId)) ? userId : null;
      
      await supabaseAdmin.from('payment_logs').insert({
        user_id: validUserId,
        subscription_id: data.id || 'unknown',
        event_type: 'CREEM_CHECKOUT_INIT',
        status: 'SUCCESS',
        details: {
          raw_user_id: userId,
          user_email: userEmail,
          plan_id: planId,
          product_id: creemProductId,
          checkout_id: data.id,
          creem_response: data
        }
      })
    } catch (logError) {
      console.error('⚠️ Failed to log Creem checkout to Supabase:', logError)
      // We don't block the user if logging fails
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    console.error('💥 [Creem Checkout] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
