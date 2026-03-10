# 🎵 FlowithMusic

**Send the song, Connect with Hearts Through Music.**

FlowithMusic 是一个音乐信件分享平台——选一首歌、写一封信，发送给朋友或任何一个同频的人。

🌐 **Live**: [www.flowithmusic.com](https://www.flowithmusic.com)

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 📝 **发送 Letter** | 填写收件人、写信、通过 Spotify 搜索并选择一首歌，生成唯一链接 |
| 👀 **查看 Letter** | 匿名访问链接即可查看信件内容 + 音乐播放器 + Emoji 互动 |
| 🔍 **Explore** | 瀑布流浏览所有公开 Letters，支持关键词搜索 |
| 🏠 **首页推荐** | 最近 Letters 轮播 + 按歌手分类的 Artist Tag 推荐 |
| 📊 **发送历史** | 登录后查看个人发送的所有 Letters |
| 📱 **H5 适配** | 移动端独立布局适配 |
| 🔗 **分享** | 每封 Letter 生成可分享的独立链接 + QR Code |

## 🛠 技术栈

| 技术 | 用途 |
|------|------|
| **Next.js 15** | React 全栈框架（App Router） |
| **TypeScript** | 类型安全 |
| **Supabase** | PostgreSQL 数据库 + Auth（Google OAuth） |
| **Spotify Web API** | 歌曲搜索 + 播放预览 |
| **Tailwind CSS 4** | 样式（部分页面使用原生 CSS） |
| **Vercel** | 部署平台 |
| **Google Analytics** | 流量分析 |

## 📂 项目结构

```
FlowtihMusic/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.tsx            # 首页
│   │   ├── layout.tsx          # 全局布局 + SEO Meta
│   │   ├── globals.css         # 全局样式
│   │   ├── send/               # 发送 Letter 页面
│   │   ├── letter/[linkId]/    # 查看单封 Letter
│   │   ├── explore/            # 探索所有 Letters
│   │   ├── history/            # 个人发送历史
│   │   ├── auth/               # OAuth 回调
│   │   ├── privacy/            # 隐私政策
│   │   ├── terms/              # 用户协议
│   │   └── api/                # API Routes
│   │       ├── letters/        # Letters CRUD + 详情
│   │       ├── spotify/        # Spotify 搜索 + 推荐
│   │       ├── home/           # 首页 Feed 数据
│   │       └── explore/        # Explore 搜索
│   ├── components/             # React 组件
│   │   ├── Header.tsx          # 导航栏（含移动端菜单）
│   │   ├── Hero.tsx            # 首页 Hero 区域
│   │   ├── MusicCards.tsx      # 音乐卡片列表
│   │   ├── SongSelector.tsx    # 歌曲搜索选择器
│   │   ├── ColorfulSpotifyPlayer.tsx  # Letter 详情播放器
│   │   ├── SpotifyEmbedPlayer.tsx     # Send 页面播放器
│   │   ├── ArtistLetters.tsx   # 首页歌手分类推荐
│   │   ├── RecentPostsCarousel.tsx    # 最近 Letters 轮播
│   │   ├── ExploreCards.tsx    # Explore 卡片列表
│   │   ├── LetterInteractions.tsx     # Letter 互动组件
│   │   ├── ShareModal.tsx      # 分享弹窗 + QR Code
│   │   ├── UserProfileModal.tsx       # 用户资料弹窗
│   │   └── Footer.tsx          # 页脚
│   ├── lib/                    # 核心服务
│   │   ├── supabase.ts         # Supabase 客户端 + 类型定义
│   │   ├── spotify.ts          # Spotify API 服务
│   │   ├── letterService.ts    # Letter CRUD 业务逻辑
│   │   ├── userService.ts      # 用户管理 + Auth 逻辑
│   │   └── ...                 # 其他辅助服务
│   ├── contexts/
│   │   └── UserContext.tsx      # 用户状态 Context
│   └── hooks/
│       └── useUserState.ts      # 用户状态 Hook
├── supabase/
│   └── schema.sql              # 数据库 Schema
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Supabase 项目（已配置）
- Spotify Developer Account

### 安装

```bash
git clone <repo-url>
cd FlowtihMusic
npm install
```

### 环境变量

创建 `.env.local` 文件：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Spotify
SPOTIFY_CLIENT_ID=ab969f52c02e4bb4b1e23d68437fe4cd
SPOTIFY_CLIENT_SECRET=35efa8d5e10d46de83c4b29faf5006b9

# Google OAuth (配置在 Supabase Dashboard)
```

### 开发

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建

```bash
npm run build
npm run start
```

## 📊 数据库结构

核心表：

| 表名 | 说明 |
|------|------|
| `users` | 用户信息（Google OAuth + 匿名用户） |
| `letters` | 音乐信件 |
| `letter_views` | 浏览记录 |
| `letter_interactions` | Emoji 互动记录 |
| `anonymous_sessions` | 匿名会话 |

## 📄 License

ISC
