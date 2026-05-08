
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

    console.log('🔍 [Creem Debug] API Key exists:', !!apiKey)
    console.log('🔍 [Creem Debug] Product ID:', creemProductId)
    console.log('🔍 [Creem Debug] Plan ID:', planId)

    if (!apiKey || !creemProductId) {
      console.error('❌ [Creem Checkout] Configuration missing')
      return NextResponse.json({ 
        error: 'Server configuration error: Missing API Key or Product ID',
        debug: { hasApiKey: !!apiKey, productId: creemProductId }
      }, { status: 500 })
    }

    const payload = {
      product_id: creemProductId,
      success_url: `${returnUrl}?status=success_creem`,
      metadata: {
        userId: userId,
        plan: planId
      },
      customer: userEmail ? { email: userEmail } : undefined
    }

    console.log('📡 [Creem Debug] Sending payload:', JSON.stringify(payload, null, 2))

    const response = await fetch('https://api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    console.log('📥 [Creem Debug] Response Status:', response.status)
    console.log('📥 [Creem Debug] Response Body:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.message || data.error || `Creem API error (${response.status})`,
        details: data 
      }, { status: response.status })
    }

    const checkoutUrl = data.url || data.checkout_url || data.checkoutUrl || data.payment_url;

    if (!checkoutUrl) {
      console.warn('⚠️ [Creem Checkout] No common URL fields found in 200 OK response:', data)
      return NextResponse.json({ 
        error: 'Creem success but URL field not found. See details.',
        details: data 
      }, { status: 200 })
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error: any) {
    console.error('💥 [Creem Checkout] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
