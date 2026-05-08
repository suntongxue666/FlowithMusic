
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, userEmail, returnUrl } = await request.json()

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

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    console.error('💥 [Creem Checkout] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
