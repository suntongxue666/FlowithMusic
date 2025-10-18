// Supabase数据库检查脚本
// 在浏览器控制台运行此脚本来验证数据库连接和数据

const checkSupabaseConnection = async () => {
  console.log('🔍 开始检查Supabase连接和数据...')
  
  try {
    // 1. 检查Supabase客户端是否可用
    const { supabase } = await import('./src/lib/supabase.js')
    if (!supabase) {
      console.error('❌ Supabase客户端未初始化')
      return
    }
    console.log('✅ Supabase客户端已连接')

    // 2. 检查Letters表结构
    console.log('\n📋 检查Letters表数据...')
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select('*')
      .limit(5)
    
    if (lettersError) {
      console.error('❌ Letters表查询失败:', lettersError)
    } else {
      console.log('✅ Letters表数据:', letters.length, '条记录')
      console.table(letters)
    }

    // 3. 检查匿名用户的Letters
    console.log('\n👤 检查匿名用户Letters...')
    const anonymousId = localStorage.getItem('anonymous_id')
    console.log('当前匿名ID:', anonymousId)
    
    if (anonymousId) {
      const { data: anonLetters, error: anonError } = await supabase
        .from('letters')
        .select('*')
        .eq('anonymous_id', anonymousId)
      
      if (anonError) {
        console.error('❌ 匿名Letters查询失败:', anonError)
      } else {
        console.log('✅ 找到匿名Letters:', anonLetters.length, '条')
        console.table(anonLetters)
      }
    }

    // 4. 检查用户表
    console.log('\n👥 检查用户表...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.error('❌ 用户表查询失败:', usersError)
    } else {
      console.log('✅ 用户表数据:', users.length, '条记录')
      console.table(users)
    }

    // 5. 测试公开Letters查询
    console.log('\n🌍 检查公开Letters...')
    const { data: publicLetters, error: publicError } = await supabase
      .from('letters')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (publicError) {
      console.error('❌ 公开Letters查询失败:', publicError)
    } else {
      console.log('✅ 公开Letters:', publicLetters.length, '条')
      console.table(publicLetters)
    }

    // 6. 检查localStorage中的Letters
    console.log('\n💾 检查localStorage中的Letters...')
    const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
    console.log('localStorage中的Letters:', localLetters.length, '条')
    console.table(localLetters)

  } catch (error) {
    console.error('❌ 检查过程中出错:', error)
  }
}

// 运行检查
checkSupabaseConnection()

console.log(`
📋 验证步骤：
1. 打开浏览器开发者工具 (F12)
2. 在Console标签中粘贴并运行此脚本
3. 查看输出结果判断数据库状态

🔧 如果发现问题：
- ❌ Supabase连接失败: 检查环境变量配置
- ❌ RLS策略阻止: 需要调整数据库权限策略  
- ❌ 数据为空: 需要创建测试数据或检查插入逻辑
`)