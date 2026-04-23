import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

/**
 * 每日通知汇总 Cron 任务
 * 建议运行频率：每日一次 (例如凌晨 02:00)
 */
export async function GET(req: Request) {
  try {
    // 简单的 API Key 验证 (可选，通过 URL 参数 ?key=xxx)
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client not available')
    }

    // 1. 获取过去 24 小时内有新通知的所有用户
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentNotifications, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!inner(email, display_name)
      `)
      .gt('created_at', twentyFourHoursAgo)
      .eq('is_read', false) // 仅汇总未读通知

    if (notifError) throw notifError

    if (!recentNotifications || recentNotifications.length === 0) {
      return NextResponse.json({ success: true, message: 'No new notifications to summarize.' })
    }

    // 2. 按用户分组通知
    const userGroups: Record<string, any[]> = {}
    recentNotifications.forEach(notif => {
      const userId = notif.user_id
      if (!userGroups[userId]) userGroups[userId] = []
      userGroups[userId].push(notif)
    })

    const results = []

    // 3. 为每个用户发送汇总邮件
    for (const userId in userGroups) {
      const notifs = userGroups[userId]
      const userEmail = notifs[0].users?.email
      const userName = notifs[0].users?.display_name || 'Friend'

      if (!userEmail) continue

      const visitCount = notifs.filter(n => n.type === 'profile_visit').length
      const interactionCount = notifs.filter(n => n.type === 'interaction').length
      
      const interactions = notifs.filter(n => n.type === 'interaction')

      // 构建 HTML 内容
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #000;">📬 Your Daily Activity Summary</h2>
          <p>Hi ${userName}, you had some activity on FlowithMusic in the last 24 hours:</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
            ${visitCount > 0 ? `<p style="font-size: 16px;">👤 <strong>${visitCount}</strong> people visited your profile.</p>` : ''}
            ${interactionCount > 0 ? `<p style="font-size: 16px;">✨ <strong>${interactionCount}</strong> people interacted with your letters.</p>` : ''}
          </div>

          ${interactionCount > 0 ? `
            <h3 style="font-size: 14px; color: #666; text-transform: uppercase;">Recent Interactions:</h3>
            <ul style="list-style: none; padding: 0;">
              ${interactions.slice(0, 5).map(i => `
                <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 12px;">${i.metadata?.emoji || '💌'}</span>
                  <span><strong>${i.actor_name}</strong> reacted with "${i.metadata?.label || 'Love'}"</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}

          <div style="margin-top: 30px; text-align: center;">
            <a href="https://www.flowithmusic.com/notifications" 
               style="background: #000; color: #fff; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block;">
               View All Notifications
            </a>
          </div>

          <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
            You are receiving this because you have new notifications on FlowithMusic.<br/>
            © 2026 FlowithMusic. All rights reserved.
          </p>
        </div>
      `

      try {
        await resend.emails.send({
          from: 'FlowithMusic <onboarding@resend.dev>',
          to: userEmail,
          subject: `📬 [Summary] ${visitCount + interactionCount} new activities on FlowithMusic`,
          html: htmlContent,
        })
        results.push({ userId, status: 'sent', email: userEmail })
      } catch (sendError) {
        console.error(`Failed to send summary to ${userEmail}:`, sendError)
        results.push({ userId, status: 'failed', email: userEmail, error: (sendError as any).message })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results
    })

  } catch (err: any) {
    console.error('Notification Summary Cron Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
