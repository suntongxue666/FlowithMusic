
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('creem-signature')
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      console.error('❌ [Creem Webhook] Missing signature or secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. 验证签名
    const hmac = crypto.createHmac('sha256', webhookSecret)
    const digest = hmac.update(rawBody).digest('hex')

    if (digest !== signature) {
      console.error('❌ [Creem Webhook] Signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    console.log('📬 [Creem Webhook] Received event:', payload.type)

    // 2. 只处理支付成功的事件
    if (payload.type === 'checkout.completed') {
      const { metadata, customer } = payload.data
      const userId = metadata?.userId
      const plan = metadata?.plan || 'monthly'

      if (!userId) {
        console.error('❌ [Creem Webhook] No userId in metadata')
        return NextResponse.json({ error: 'No userId' }, { status: 400 })
      }

      // 3. 初始化 Supabase (使用 Service Role Key 以绕过 RLS)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // 4. 计算过期时间
      const expiryDate = new Date()
      if (plan === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1)
      }

      console.log(`✨ [Creem Webhook] Granting Premium to ${userId} until ${expiryDate.toISOString()}`)

      // 5. 更新用户状态
      const { error } = await supabase
        .from('users')
        .update({
          is_premium: true,
          premium_until: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            creem_customer_id: customer?.id,
            last_payment_method: 'creem',
            last_plan: plan
          }
        })
        .eq('id', userId)

      if (error) {
        console.error('❌ [Creem Webhook] DB Update Error:', error)
        throw error
      }

      // 6. 记录日志到 payment_logs
      try {
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const validUserId = (userId && isUUID(userId)) ? userId : null;

        await supabase.from('payment_logs').insert({
          user_id: validUserId,
          subscription_id: payload.data?.id || 'unknown',
          event_type: 'CREEM_PAYMENT_SUCCESS',
          status: 'SUCCESS',
          details: {
            raw_user_id: userId,
            plan: plan,
            customer: customer,
            payload: payload
          }
        })
      } catch (logError) {
        console.error('⚠️ [Creem Webhook] Logging failed:', logError)
      }

      console.log('✅ [Creem Webhook] User upgraded successfully')
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('💥 [Creem Webhook] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
