// 检查特定Letter是否存在于数据库中
// linkId: 202507260855J3mUeV

const checkSpecificLetter = async () => {
  console.log('🔍 检查Letter: 202507260855J3mUeV')
  
  try {
    // 导入Supabase客户端
    const { supabase } = await import('./src/lib/supabase.js')
    
    if (!supabase) {
      console.error('❌ Supabase客户端未初始化')
      return
    }

    const linkId = '202507260855J3mUeV'
    
    // 1. 通过linkId查询Letter
    console.log('\n📋 通过linkId查询Letter...')
    const { data: letterByLink, error: linkError } = await supabase
      .from('letters')
      .select('*')
      .eq('link_id', linkId)
      .single()
    
    if (linkError) {
      console.error('❌ linkId查询失败:', linkError)
      
      // 如果单个查询失败，尝试查询所有匹配的记录
      console.log('\n🔄 尝试查询所有匹配记录...')
      const { data: allMatches, error: allError } = await supabase
        .from('letters')
        .select('*')
        .eq('link_id', linkId)
      
      if (allError) {
        console.error('❌ 所有匹配记录查询失败:', allError)
      } else {
        console.log('✅ 找到匹配记录:', allMatches.length, '条')
        console.table(allMatches)
      }
    } else {
      console.log('✅ 找到Letter:', letterByLink)
      console.table([letterByLink])
      
      // 检查Letter的详细信息
      console.log('\n📝 Letter详细信息:')
      console.log('ID:', letterByLink.id)
      console.log('标题:', letterByLink.title)
      console.log('内容:', letterByLink.content?.substring(0, 100) + '...')
      console.log('是否公开:', letterByLink.is_public)
      console.log('创建时间:', letterByLink.created_at)
      console.log('用户ID:', letterByLink.user_id)
      console.log('匿名ID:', letterByLink.anonymous_id)
      console.log('音乐数据:', letterByLink.music_data ? 'Yes' : 'No')
    }

    // 2. 检查最近创建的Letters
    console.log('\n⏰ 检查最近15分钟内创建的Letters...')
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    
    const { data: recentLetters, error: recentError } = await supabase
      .from('letters')
      .select('*')
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
    
    if (recentError) {
      console.error('❌ 最近Letters查询失败:', recentError)
    } else {
      console.log('✅ 最近15分钟内的Letters:', recentLetters.length, '条')
      console.table(recentLetters)
      
      // 检查是否包含目标linkId
      const targetLetter = recentLetters.find(letter => letter.link_id === linkId)
      if (targetLetter) {
        console.log('🎯 找到目标Letter在最近创建的记录中!')
      } else {
        console.log('❌ 目标Letter不在最近创建的记录中')
      }
    }

    // 3. 检查linkId模式匹配
    console.log('\n🔍 检查类似linkId的Letters...')
    const { data: similarLetters, error: similarError } = await supabase
      .from('letters')
      .select('*')
      .like('link_id', '202507260855%')
    
    if (similarError) {
      console.error('❌ 类似linkId查询失败:', similarError)
    } else {
      console.log('✅ 找到类似linkId的Letters:', similarLetters.length, '条')
      console.table(similarLetters)
    }

    // 4. 检查数据库表的总记录数
    console.log('\n📊 检查数据库状态...')
    const { count, error: countError } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ 记录计数失败:', countError)
    } else {
      console.log('✅ Letters表总记录数:', count)
    }

  } catch (error) {
    console.error('❌ 检查过程中出错:', error)
  }
}

// 运行检查
checkSpecificLetter()

console.log(`
🎯 检查目标: Letter with linkId = 202507260855J3mUeV

📋 验证步骤：
1. 在 https://www.flowithmusic.com 打开浏览器开发者工具 (F12)
2. 在Console标签中粘贴并运行此脚本
3. 查看输出结果确认Letter是否存在

🔍 检查内容：
- ✅ 直接通过linkId查询
- ✅ 检查最近15分钟创建的Letters
- ✅ 检查类似linkId的记录
- ✅ 统计数据库总记录数

💡 如果Letter存在但网页显示"Letter not found"：
- 可能是RLS策略问题，需要执行 fix-rls-policies.sql
- 可能是缓存问题，清除浏览器缓存后重试
`)