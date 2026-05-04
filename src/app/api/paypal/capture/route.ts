import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { orderID, userId, anonymousId, plan, productType, linkId } = await req.json()

    if (!orderID) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log(`🚀 [Server Capture] Starting for order: ${orderID}, Type: ${productType}, User: ${userId || anonymousId}`)

    const client = supabaseAdmin || supabase
    if (!client) throw new Error('Database client not available')

    // 1. Get PayPal Access Token
    const auth = Buffer.from(
      `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
    ).toString('base64')

    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(`Failed to get access token: ${JSON.stringify(error)}`)
    }

    const { access_token } = await tokenResponse.json()

    // 2. Capture Order
    const captureResponse = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    const captureData = await captureResponse.json()

    // 3. Log initial attempt
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const validUserId = (userId && isUUID(userId)) ? userId : null;

    await client.from('payment_logs').insert({
      user_id: validUserId,
      subscription_id: orderID,
      event_type: 'ORDER_CAPTURE_RESULT',
      status: captureResponse.ok ? 'SUCCESS' : 'FAILED',
      details: {
        raw_user_id: userId,
        anonymous_id: anonymousId,
        orderID,
        productType,
        plan,
        linkId,
        response: captureData
      }
    })

    if (!captureResponse.ok) {
      console.error('❌ PayPal Capture Failed:', captureData)
      return NextResponse.json({ error: 'PayPal capture failed', details: captureData }, { status: captureResponse.status })
    }

    // 4. Handle Post-Capture Logic (Database Updates)
    // We do this on the server to guarantee it happens even if client disconnects
    
    if (productType === 'premium') {
      // 🚀 Premium Subscription Logic
      const isAnnual = (plan || '').includes('yearly')
      const expiryDate = new Date()
      if (isAnnual) expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      else expiryDate.setMonth(expiryDate.getMonth() + 1)

      let targetUserId = userId;
      
      // If we only have anonymousId, try to find the actual user record
      if (!targetUserId && anonymousId) {
        const { data: existingUser } = await client
          .from('users')
          .select('id')
          .eq('anonymous_id', anonymousId)
          .maybeSingle();
        
        if (existingUser) {
          targetUserId = existingUser.id;
        } else {
          // If no user found, we'll create one or it will be upserted below
          targetUserId = crypto.randomUUID();
        }
      }

      if (targetUserId) {
        const { error: upsertError } = await client
          .from('users')
          .upsert({
            id: targetUserId,
            anonymous_id: anonymousId || null,
            is_premium: true,
            premium_until: expiryDate.toISOString(),
            updated_at: new Date().toISOString(),
            metadata: { 
              last_subscription_id: orderID,
              last_plan: isAnnual ? 'yearly' : 'monthly'
            }
          }, { onConflict: 'id' })

        if (upsertError) {
          console.error('❌ Failed to update user premium status on server:', upsertError)
          // Note: We don't return error to user because the money WAS taken. 
          // We'll rely on webhooks as a second layer.
        } else {
          console.log(`✅ Server updated premium status for user ${targetUserId}`)
        }
      }
    } else if (productType === 'flowing_emoji' && linkId) {
      // 🚀 Flowing Emoji Logic
      const { error: updateError } = await client
        .from('letters')
        .update({ effect_type: 'flowing_emoji' })
        .eq('link_id', linkId)

      if (updateError) {
        console.error('❌ Failed to update letter effect status on server:', updateError)
      } else {
        console.log(`✅ Server updated effect status for letter ${linkId}`)
      }
    }

    console.log('✅ PayPal Order Processed Successfully:', orderID)

    return NextResponse.json({ 
      success: true, 
      details: captureData 
    })
  } catch (error: any) {
    console.error('❌ Capture Order Fatal Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
