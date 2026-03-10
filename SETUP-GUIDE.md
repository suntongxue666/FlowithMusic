# 🎵 FlowithMusic - 用户身份与数据管理系统配置指南

## 📋 系统概述

FlowithMusic现在集成了完整的用户身份管理和数据持久化系统，支持：

- ✅ **匿名用户** - 无需注册即可创建Letter
- ✅ **Google OAuth登录** - 一键登录，数据安全同步
- ✅ **数据迁移** - 匿名数据无缝转移到正式账户
- ✅ **用户信息流** - 社区化的Letter分享与发现
- ✅ **隐私控制** - Letter公开/私密设置
- ✅ **统计分析** - 浏览量、创建数量等数据
- ✅ **金币系统** - 为未来功能扩展准备

## 🚀 快速开始

### 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 在SQL编辑器中执行 `supabase/schema.sql` 创建数据库表
4. 在Authentication > Settings中配置Google OAuth

### 2. 配置Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目或选择现有项目
3. 启用Google+ API
4. 创建OAuth 2.0客户端ID
5. 添加重定向URI：`https://your-project.supabase.co/auth/v1/callback`
6. 在Supabase项目的Authentication > Settings > Auth Providers中配置Google

### 3. 环境变量配置

复制 `.env.example` 为 `.env.local`：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Spotify API配置
SPOTIFY_CLIENT_ID=ab969f52c02e4bb4b1e23d68437fe4cd
SPOTIFY_CLIENT_SECRET=35efa8d5e10d46de83c4b29faf5006b9

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 安装依赖

```bash
npm install @supabase/supabase-js
```

### 5. 启动应用

```bash
npm run dev
```

## 🏗️ 系统架构

### 数据流程图

```
匿名用户 → 创建Letter → localStorage + Supabase
    ↓
Google登录 → 数据迁移 → 正式用户账户
    ↓
信息流展示 ← 筛选/搜索 ← 公开Letters
```

### 核心服务

1. **UserService** - 用户认证和管理
2. **LetterService** - Letter CRUD操作
3. **UserContext** - 全局状态管理

## 📊 数据库设计

### 核心表结构

#### users 表
- 存储用户基本信息
- 支持匿名ID关联
- 金币和会员系统

#### letters 表
- Letter内容和元数据
- 支持匿名/认证用户
- 浏览统计和隐私控制

#### anonymous_sessions 表
- 匿名会话管理
- 数据迁移追踪

## 🔄 数据迁移流程

1. **匿名阶段**：Letter存储时 `user_id=null, anonymous_id=xxx`
2. **登录时**：自动将所有匿名Letter的 `anonymous_id` 转换为 `user_id`
3. **数据一致性**：确保每个Letter只属于一个用户

## 📱 使用示例

### 基础用法

```tsx
import { useUser } from '@/contexts/UserContext'
import { letterService } from '@/lib/letterService'

function MyComponent() {
  const { user, isAuthenticated, signInWithGoogle } = useUser()
  
  const createLetter = async (data) => {
    const letter = await letterService.createLetter(data)
    console.log('Letter创建成功:', letter)
  }
  
  return (
    <div>
      {isAuthenticated ? (
        <p>欢迎, {user.display_name}!</p>
      ) : (
        <button onClick={signInWithGoogle}>
          Google登录
        </button>
      )}
    </div>
  )
}
```

### 信息流查询

```tsx
// 获取公开Letters
const publicLetters = await letterService.getPublicLetters(20, 0, 'created_at')

// 按艺术家筛选
const filteredLetters = await letterService.getPublicLetters(20, 0, 'view_count', {
  artist: 'Taylor Swift'
})

// 搜索Letters
const searchResults = await letterService.searchLetters('love song')
```

## 🔒 安全特性

- **行级安全策略(RLS)** - 数据库级别的访问控制
- **JWT认证** - Supabase内置安全认证
- **HTTPS强制** - 生产环境强制使用HTTPS
- **输入验证** - 前后端双重验证

## 📈 性能优化

- **数据库索引** - 关键字段已建立索引
- **分页查询** - 大数据量分页加载
- **缓存策略** - 用户状态本地缓存
- **懒加载** - 按需加载用户数据

## 🔧 开发工具

### 调试用户状态

```tsx
import { userService } from '@/lib/userService'

// 控制台调试
console.log('当前用户:', userService.getCurrentUser())
console.log('匿名ID:', userService.getAnonymousId())
console.log('是否已登录:', userService.isAuthenticated())
```

### 数据库查询测试

在Supabase SQL编辑器中测试查询：

```sql
-- 查看用户统计
SELECT 
  u.display_name,
  COUNT(l.id) as letter_count,
  SUM(l.view_count) as total_views
FROM users u
LEFT JOIN letters l ON u.id = l.user_id
GROUP BY u.id, u.display_name;

-- 查看热门艺术家
SELECT 
  song_artist,
  COUNT(*) as count
FROM letters
WHERE is_public = true
GROUP BY song_artist
ORDER BY count DESC
LIMIT 10;
```

## 🚀 部署指南

### Vercel部署

1. 连接GitHub仓库到Vercel
2. 配置环境变量
3. 部署完成后更新Supabase的重定向URL

### 环境变量配置

```bash
# Vercel环境变量设置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SPOTIFY_CLIENT_ID=ab969f52c02e4bb4b1e23d68437fe4cd
SPOTIFY_CLIENT_SECRET=35efa8d5e10d46de83c4b29faf5006b9
```

## 📋 TODO: 后续功能

1. **实现信息流组件** - 首页和Explore页面
2. **更新现有组件** - 使用新的Letter服务
3. **用户个人资料页** - 展示用户统计和设置
4. **社交功能** - 关注、点赞、评论
5. **金币系统** - 解锁隐藏内容
6. **推送通知** - 新Letter提醒
7. **移动端优化** - PWA支持

## 🐛 常见问题

### Q: 登录后看不到之前的匿名Letter？
A: 检查localStorage中的`anonymous_id`，确保登录流程正确执行了数据迁移。

### Q: Supabase RLS策略报错？
A: 确保在SQL编辑器中完整执行了schema.sql文件。

### Q: Google OAuth重定向失败？
A: 检查Google Cloud Console中的重定向URI配置是否正确。

## 📞 技术支持

如有问题，请检查：
1. 浏览器开发者工具控制台
2. Supabase项目的日志
3. 网络请求状态

---

**系统就绪！** 🎉 现在你拥有了一个完整的用户管理和数据持久化系统。

---

## 📝 维护日志

### 2026-03-11: Spotify 基础设施迁移
- **变更原因**: 由于 Spotify 官方规则升级，开发者账号（App Owner）必须拥有有效的 Premium 订阅才能使用搜索和推荐接口。原有的香港账号因信用卡支付限制无法续费。
- **操作内容**:
  1. 创建了新的 Spotify 开发者应用。
  2. 更新了 `.env.local` 中的 `SPOTIFY_CLIENT_ID` 和 `SPOTIFY_CLIENT_SECRET`。
  3. 更新了云端部署平台（Vercel/Railway）的环境变量。
  4. 同步更新了 `README.md` 和 `SETUP-GUIDE.md` 文档。
- **状态**: ✅ 已修复 500/403 错误，歌曲搜索功能恢复正常。