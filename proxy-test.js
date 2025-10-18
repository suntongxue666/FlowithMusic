// 测试代理API绕过浏览器扩展干扰
console.log('🔧 测试Supabase代理API...')

// 1. 测试代理连接
console.log('\n1️⃣ 测试代理连接状态...')
fetch('/api/supabase-proxy?action=test&table=letters')
  .then(response => response.json())
  .then(result => {
    console.log('📊 代理连接测试结果:', result)
    if (result.success) {
      console.log('✅ 代理API工作正常!')
    } else {
      console.log('❌ 代理API连接失败:', result.error)
    }
  })
  .catch(error => {
    console.error('❌ 代理API测试失败:', error)
  })

// 2. 测试通过代理查询数据
setTimeout(() => {
  console.log('\n2️⃣ 通过代理查询Letters...')
  
  fetch('/api/supabase-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'select',
      table: 'letters',
      options: {
        select: 'id,link_id,recipient_name,song_title,created_at',
        limit: 5
      }
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log('📋 代理查询结果:', result)
    if (result.data) {
      console.log('✅ 代理查询成功! 找到', result.data.length, '条记录')
      console.log('📝 LinkIDs:', result.data.map(l => l.link_id))
    } else {
      console.log('❌ 代理查询失败:', result.error)
    }
  })
  .catch(error => {
    console.error('❌ 代理查询异常:', error)
  })
}, 1000)

// 3. 测试查询特定linkId
setTimeout(() => {
  const targetLinkId = '202507260956OjBgfJ'
  console.log('\n3️⃣ 通过代理查询特定linkId:', targetLinkId)
  
  fetch('/api/supabase-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'select',
      table: 'letters',
      filters: {
        eq: { link_id: targetLinkId }
      },
      options: {
        select: '*',
        single: true
      }
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log('🎯 特定查询结果:', result)
    if (result.data) {
      console.log('✅ 找到目标Letter!')
      console.log('📝 Letter详情:', result.data)
    } else {
      console.log('❌ 没有找到目标Letter')
      console.log('🔍 错误信息:', result.error)
    }
  })
  .catch(error => {
    console.error('❌ 特定查询异常:', error)
  })
}, 2000)

// 4. 测试创建新Letter
setTimeout(() => {
  console.log('\n4️⃣ 通过代理创建测试Letter...')
  
  const testLetter = {
    link_id: 'proxy_test_' + Date.now(),
    recipient_name: '代理测试用户',
    message: '这是通过代理API创建的测试Letter，用于验证绕过浏览器扩展干扰。',
    song_title: 'Proxy Test Song',
    song_artist: 'Test Artist',
    song_album_cover: 'https://via.placeholder.com/300',
    anonymous_id: 'proxy_test_' + Date.now(),
    is_public: true
  }
  
  fetch('/api/supabase-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'insert',
      table: 'letters',
      data: testLetter
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log('📝 代理创建结果:', result)
    if (result.data) {
      console.log('✅ 代理创建成功!')
      console.log('🆔 新Letter ID:', result.data.id)
      console.log('🔗 新Link ID:', result.data.link_id)
    } else {
      console.log('❌ 代理创建失败:', result.error)
    }
  })
  .catch(error => {
    console.error('❌ 代理创建异常:', error)
  })
}, 3000)

console.log('📋 代理API测试已启动，请等待结果...')