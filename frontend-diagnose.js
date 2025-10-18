// 在浏览器控制台运行此脚本来检查Letter创建过程
// 请在 https://www.flowithmusic.com 的任意页面打开控制台运行

console.log('🔍 开始诊断Letter创建问题...')

// 1. 检查localStorage中的数据
console.log('\n📱 检查localStorage:')
const localLetters = JSON.parse(localStorage.getItem('letters') || '[]')
console.log('localStorage中的Letters数量:', localLetters.length)
console.log('localStorage中的Letters:', localLetters)

// 查找最新的Letter
if (localLetters.length > 0) {
  const latestLocal = localLetters[localLetters.length - 1]
  console.log('最新的本地Letter:', latestLocal)
  console.log('最新Letter的linkId:', latestLocal.link_id)
}

// 2. 检查匿名ID
console.log('\n👤 检查匿名用户ID:')
const anonymousId = localStorage.getItem('anonymous_id')
console.log('匿名ID:', anonymousId)

// 3. 测试Supabase连接
console.log('\n🔗 测试Supabase连接:')
try {
  // 尝试导入letterService
  import('./src/lib/letterService.js').then(module => {
    console.log('letterService模块加载成功')
    
    // 测试获取Letters
    module.letterService.getUserLetters(10, 0).then(letters => {
      console.log('✅ getUserLetters成功，获取到', letters.length, '条Letters')
      console.log('用户Letters:', letters)
      
      // 查找目标linkId
      const targetLetter = letters.find(l => l.link_id === '202507260934GNQatP')
      if (targetLetter) {
        console.log('🎯 找到目标Letter:', targetLetter)
      } else {
        console.log('❌ 未找到linkId为202507260934GNQatP的Letter')
        console.log('现有的linkIds:', letters.map(l => l.link_id))
      }
    }).catch(error => {
      console.error('❌ getUserLetters失败:', error)
    })
  }).catch(error => {
    console.error('❌ 无法加载letterService:', error)
  })
} catch (error) {
  console.error('❌ Supabase连接测试失败:', error)
}

// 4. 检查网络请求历史（需要在创建Letter时运行）
console.log('\n🌐 网络请求检查:')
console.log('请在创建新Letter时观察Network标签中的API请求')
console.log('特别关注以下端点:')
console.log('- POST请求到Supabase')
console.log('- 请求状态码是否为200/201')
console.log('- 响应内容是否包含创建的Letter数据')

// 5. 创建测试Letter的函数
console.log('\n🧪 如需测试Letter创建，请运行以下代码:')
console.log(`
// 测试创建Letter
import('./src/lib/letterService.js').then(module => {
  const testLetter = {
    recipient_name: 'Test User',
    message: 'This is a test message to verify Letter creation is working properly in the database.',
    song_id: 'test_song_id',
    song_title: 'Test Song',
    song_artist: 'Test Artist',
    song_album: 'Test Album',
    song_album_cover: 'https://example.com/cover.jpg',
    song_preview_url: null,
    song_spotify_url: 'https://open.spotify.com/track/test',
    music_data: {
      title: 'Test Song',
      artist: 'Test Artist'
    },
    is_public: true
  }
  
  module.letterService.createLetter(testLetter).then(result => {
    console.log('✅ 测试Letter创建成功:', result)
    console.log('新Letter的linkId:', result.link_id)
  }).catch(error => {
    console.error('❌ 测试Letter创建失败:', error)
  })
})
`)

console.log('\n📋 诊断完成！请检查上述输出并运行数据库查询。')