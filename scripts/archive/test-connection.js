// 测试Supabase连接的脚本
// 在前端控制台运行此脚本来验证数据库连接

console.log('🔍 开始测试Supabase连接...')

// 检查环境变量
console.log('📋 环境变量检查:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY长度:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0)

// 尝试导入并测试Supabase客户端
try {
  // 手动创建Supabase客户端进行测试
  import('@supabase/supabase-js').then(({ createClient }) => {
    console.log('\n🔗 创建Supabase客户端...')
    
    const supabaseUrl = 'https://flowithmusic-db.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU'
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('✅ Supabase客户端创建成功')
    
    // 测试连接
    console.log('\n🧪 测试数据库连接...')
    
    // 1. 测试简单查询
    supabase
      .from('letters')
      .select('count')
      .then(result => {
        console.log('📊 基础连接测试结果:', result)
        if (result.error) {
          console.error('❌ 连接错误:', result.error)
        } else {
          console.log('✅ 基础连接成功')
        }
      })
      .catch(error => {
        console.error('❌ 连接异常:', error)
      })
    
    // 2. 测试查询特定Letter
    const testLinkId = '202507260956OjBgfJ'
    console.log(`\n🔍 查询Letter: ${testLinkId}`)
    
    supabase
      .from('letters')
      .select('*')
      .eq('link_id', testLinkId)
      .single()
      .then(result => {
        console.log('📝 Letter查询结果:', result)
        if (result.error) {
          console.error('❌ 查询错误:', result.error)
          if (result.error.code === 'PGRST116') {
            console.log('💡 这表示查询成功但没有找到数据')
          }
        } else {
          console.log('✅ 找到Letter:', result.data)
        }
      })
      .catch(error => {
        console.error('❌ 查询异常:', error)
      })
    
    // 3. 测试获取所有Letters
    console.log('\n📋 获取所有Letters...')
    supabase
      .from('letters')
      .select('id, link_id, recipient_name, song_title, created_at')
      .limit(10)
      .then(result => {
        console.log('📊 所有Letters查询结果:', result)
        if (result.error) {
          console.error('❌ 查询错误:', result.error)
        } else {
          console.log('✅ 查询成功，找到', result.data?.length || 0, '条Letters')
          console.log('📝 Letters列表:', result.data)
        }
      })
      .catch(error => {
        console.error('❌ 查询异常:', error)
      })
    
    // 4. 测试创建Letter
    console.log('\n🧪 测试创建Letter...')
    const testLetter = {
      link_id: 'test_' + Date.now(),
      recipient_name: 'Test User',
      message: 'This is a test message to verify database connectivity.',
      song_title: 'Test Song',
      song_artist: 'Test Artist',
      song_album_cover: 'https://via.placeholder.com/300',
      anonymous_id: 'test_anonymous_' + Date.now(),
      is_public: true
    }
    
    supabase
      .from('letters')
      .insert(testLetter)
      .select()
      .single()
      .then(result => {
        console.log('📝 创建Letter结果:', result)
        if (result.error) {
          console.error('❌ 创建错误:', result.error)
        } else {
          console.log('✅ 创建成功:', result.data)
        }
      })
      .catch(error => {
        console.error('❌ 创建异常:', error)
      })
    
  }).catch(error => {
    console.error('❌ 无法导入Supabase:', error)
  })
  
} catch (error) {
  console.error('❌ 测试脚本错误:', error)
}

console.log('\n📋 请等待测试结果...')