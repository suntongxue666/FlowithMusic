import { createClient } from '@supabase/supabase-js'

// --- 配置配置项 ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oiggdnnehohoaycyiydn.supabase.co'
// 注意：如果直接执行这段脚本，可能需要使用你的 SERVICE_ROLE_KEY 或拥有对应权限的 ANON_KEY
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'

const STEPFUN_API_KEY = '4LgR39N5EtSdABQUiddyNuGmXU8Y1mZ2XyTtlY1Urs8tSE8MoFa2mKrpt9a8SooxS'
const STEPFUN_API_URL = 'https://api.stepfun.com/v1/chat/completions'

// 初始化 Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 延迟函数避免被限流
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function classifyLetter(message: string, songTitle: string): Promise<string> {
    const prompt = `Classify the following message into one category. If it is hard to decide based on the message alone, you can infer the category from the song's style or context.

Categories:
Family
Friendship
Love

Return JSON only:

{"category": "Family"}

Message:
${message}

Song:
${songTitle}`

    try {
        const response = await fetch(STEPFUN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STEPFUN_API_KEY}`
            },
            body: JSON.stringify({
                model: 'step-1-8k',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1, // 低温度以保证输出唯一性和稳定性
                max_tokens: 30
            })
        })

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`)
        }

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content?.trim() || ''
        console.log(`[AI Response Full]: "${result}"`)

        // 尝试解析 JSON
        try {
            const jsonStart = result.indexOf('{')
            const jsonEnd = result.lastIndexOf('}')
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonObj = JSON.parse(result.substring(jsonStart, jsonEnd + 1))
                if (jsonObj.category) {
                    const cat = jsonObj.category
                    if (cat.includes('Family') || cat.includes('family')) return 'Family'
                    if (cat.includes('Friendship') || cat.includes('friendship')) return 'Friendship'
                    if (cat.includes('Love') || cat.includes('love')) return 'Love'
                }
            }
        } catch (e) {
            console.error('JSON 解析失败，降级为文本匹配:', e)
        }

        // 再次过滤，确保只返回三个允许的值之一
        if (result.includes('Family') || result.includes('family')) return 'Family'
        if (result.includes('Friendship') || result.includes('friendship')) return 'Friendship'
        if (result.includes('Love') || result.includes('love')) return 'Love'

        return 'Unknown' // 如果确实无法判断，返回 Unknown 以便你核实
    } catch (error) {
        console.error('AI 分类失败:', error)
        return 'Unknown' // 网络或其他异常也返回 Unknown
    }
}

async function runMigration() {
    console.log('🚀 开始尝试通过 AI 分析填充历史信件的 category 字段...')

    let totalProcessed = 0
    let successCount = 0
    let failCount = 0

    while (true) {
        // 1. 每次仅获取一批数据解决数据量太大可能触发的问题
        const fetchLimit = 500

        const { data: letters, error } = await supabase
            .from('letters')
            .select('id, message, song_title, category')
            .is('category', null)
            .limit(fetchLimit)

        if (error) {
            if (error.code === 'PGRST204') {
                console.error('❌ 获取失败。可能是 "category" 列还未在 Supabase 数据库中创建。请先在你的 Supabase 控制台的 letters 表中添加一个类型为 text 的 category 列。')
            } else {
                console.error('❌ 获取未分类的历史信件失败:', error)
            }
            return
        }

        if (!letters || letters.length === 0) {
            console.log('✅ 没有找到需要分类的空 category 信件，可能是已经全部分类完毕或列表为空。')
            break
        }

        console.log(`📦 正在处理本批次的 ${letters.length} 封信件... (已处理: ${totalProcessed})`)

        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i]
            console.log(`[Batch ${totalProcessed + i + 1}] 正在分析信件: ${letter.id}`)

            // 如果 message 或 songTitle 不存在，随意兜底。
            const message = letter.message || '(空留言)'
            const songTitle = letter.song_title || '(未知歌曲)'

            const category = await classifyLetter(message, songTitle)
            console.log(`   -> AI 判断结果: ${category}`)

            // 2. 更新到 Supabase
            const { error: updateError } = await supabase
                .from('letters')
                .update({ category })
                .eq('id', letter.id)

            if (updateError) {
                console.error(`❌ 更新信件 ${letter.id} 失败:`, updateError)
                failCount++
            } else {
                successCount++
            }

            // 等待一小会儿，防止触发 API 限流
            await delay(300)
        }

        totalProcessed += letters.length

        // 如果获取到的数量小于我们设定的限制数量，说明下一批肯定没了，可以直接结束
        if (letters.length < fetchLimit) {
            break
        }
    }

    console.log('🎉 处理完成！')
    console.log(`总计: ${totalProcessed} | 成功: ${successCount} | 失败: ${failCount}`)
    console.log('⚠️ 小提示：由于你是使用 client key 进行更新的，如果发现更新失败（权限不足 RLS），请将 SUPABASE_KEY 换成你的 Service Role Key 重试，或者暂时关闭 letters 表的 Update RLS 策略。')
}

// 运行
runMigration().catch(console.error)
