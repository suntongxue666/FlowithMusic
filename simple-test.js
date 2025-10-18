// 简化的数据库连接测试
console.log('🔍 开始检查数据库连接状态...')

// 测试新的Supabase URL
const testUrl = 'https://oiggdnnehohoacyiydn.supabase.co'
console.log('📋 测试URL:', testUrl)

// 简单的网络连接测试
fetch(testUrl + '/rest/v1/', {
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ 网络连接成功，状态码:', response.status)
  return response.text()
})
.then(data => {
  console.log('📝 响应数据:', data)
})
.catch(error => {
  console.error('❌ 网络连接失败:', error)
})

// 测试查询letters表
setTimeout(() => {
  console.log('\n🔍 测试查询letters表...')
  
  fetch(testUrl + '/rest/v1/letters?select=id,link_id,recipient_name,created_at&limit=5', {
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📊 查询响应状态:', response.status)
    return response.json()
  })
  .then(data => {
    console.log('📝 查询结果:', data)
    console.log('💡 找到', data.length, '条letters')
    
    if (data.length > 0) {
      console.log('📋 所有linkId:', data.map(l => l.link_id))
    }
  })
  .catch(error => {
    console.error('❌ 查询失败:', error)
  })
}, 1000)

// 测试特定的linkId
setTimeout(() => {
  const targetLinkId = '202507260956OjBgfJ'
  console.log('\n🎯 测试查询特定linkId:', targetLinkId)
  
  fetch(testUrl + `/rest/v1/letters?link_id=eq.${targetLinkId}`, {
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2dkbm5laG9ob2F5Y3lpeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjQ2NjksImV4cCI6MjA2OTAwMDY2OX0.lGA8b4PwJJog7YT8DXtBgiDJ7oXMzDXy7RXf43COrIU',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('🎯 特定查询状态:', response.status)
    return response.json()
  })
  .then(data => {
    console.log('🎯 特定查询结果:', data)
    if (data.length > 0) {
      console.log('✅ 找到目标Letter!')
    } else {
      console.log('❌ 没有找到目标Letter')
    }
  })
  .catch(error => {
    console.error('❌ 特定查询失败:', error)
  })
}, 2000)

console.log('📋 测试脚本已启动，请等待结果...')