# FlowithMusic 🎵

A soulful social platform where songs carry your unsaid words. Connect through music, send digital letters with embedded Spotify tracks, and discover the hidden tunes in people's hearts.

## 🚀 Architecture & Core Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (globals.css) + Tailwind (Utility fragments)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Authentication)
- **Music API**: [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- **Payments**: [PayPal Checkout SDK](https://developer.paypal.com/docs/checkout/)
- **Deployment**: Vercel

## 📂 Project Structure

### Core Directories
- `/src/app`: Production routes and Page components. (Lean & Clean)
- `/src/components`: Reusable UI elements (Hero, Navbar, Footer, etc.).
- `/src/lib`: Core service logic (Supabase clients, Letter/User management).
- `/src/hooks`: Custom React hooks (Auth, Window state).
- `/src/contexts`: React Context providers (Auth, Theme).

### Core Routes (src/app)
- `/`: Homepage with Hero and Call-to-actions.
- `/send`: Letter creation with Spotify search.
- `/explore`: Public letter feed with category filters.
- `/history`: Personal letter history and synced records.
- `/letter/[linkId]`: Individual letter detail view.
- `/user/[id]`: User profile page.
- `/premium`: Subscription plans and PayPal integration.
- `/notifications`: User notification center.
- `/auth`: Authentication callback handler for Supabase.

### Key Features
- **Send Letter**: Select a Spotify track, add a message, and choice an optional "Flowing Emoji" animation.
- **Explore**: Search and filter public letters by category (Love, Friendship, Family).
- **History/My Letters**: Manage your sent letters and synced guest letters.
- **Premium Access**: Subscription-based benefits (No ads, Flowing Emoji unlock, Unlimited Sends).
- **User Identity**: Seamless transition from Guest (Anonymous ID) to Registered User (Supabase Auth).

## 🛠 Features Status & User Identity
The project currently manages user identity through a dual-layer system:
1. **Anonymous Mode**: Tracks guest users via persistent local IDs.
2. **Authenticated Mode**: Syncs local history to Supabase once logged in.
3. **Premium Logic**: Managed via `is_premium` / `is_admin` flags in the `users` table.

## 🛠 Scalability & Optimization (Edge Caching)

### **2026-05-06: Implement Cloudflare Workers Read-through Cache (Phase 1)**
To address high traffic demand and prevent Supabase from hitting free-tier limits, we implemented a read-through caching layer for the `letters` table.
- **Provider**: Cloudflare Workers + Cloudflare KV.
- **Mechanism**: All `GET` requests to the `letters` table are intercepted by a worker proxy. Data is cached in KV for 1 hour.
- **Result**: Significantly reduced Supabase CPU load and decreased global response latency.

### **Phase 2: R2 Staticization (Planned)**
Conditions for implementation:
- Daily active users (DAU) consistently exceed 10,000.
- Requirement for absolute decoupling from the database for popular public letters.
- Goal: Zero-egress cost and perpetual availability via static HTML files stored in Cloudflare R2.

---

## 🧹 Maintenance & Technical Debt
(Reference `ARCH_CLEANUP_PLAN.md` for detailed roadmap)

Many `debug-*` and `test-*` routes in `/src/app` are legacy diagnostic tools and can be safely removed to clean up the navigation tree once the core features are validated.

## 📜 License
© 2026 FlowithMusic. All rights reserved.

---

# FlowithMusic (中文版) 🎵

一个富有灵魂的社交平台，让音乐承载你未曾说出口的话。通过音乐建立连接，发送嵌入 Spotify 轨道的数字信件，发现他人心中隐藏的旋律。

## 🚀 架构与核心技术栈

- **框架**: [Next.js 14+](https://nextjs.org/) (App Router)
- **语言**: TypeScript
- **样式**: 原生 CSS (globals.css) + Tailwind (部分功能组件)
- **后端与鉴权**: [Supabase](https://supabase.com/) (PostgreSQL, Authentication)
- **音乐 API**: [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- **支付**: [PayPal Checkout SDK](https://developer.paypal.com/docs/checkout/)
- **部署**: Vercel

## 📂 项目结构

### 核心目录
- `/src/app`: 生产路由与页面组件（已精简）。
- `/src/components`: 可复用的 UI 元素（Hero, Navbar, Footer 等）。
- `/src/lib`: 核心逻辑服务（Supabase 客户端、信件/用户管理）。
- `/src/hooks`: 自定义 React Hooks (鉴权、窗口状态等)。
- `/src/contexts`: React Context 提供者 (鉴权、主题等)。

### 核心路由 (src/app)
- `/`: 带有 Hero 区域和功能入口的首页。
- `/send`: 带有 Spotify 搜索功能的信件创建页。
- `/explore`: 公开信件流，支持分类过滤。
- `/history`: 个人信件历史与同步记录页。
- `/letter/[linkId]`: 单封信件的详情展示页。
- `/user/[id]`: 用户个人资料页。
- `/premium`: 会员订阅方案与 PayPal 支付集成页。
- `/notifications`: 用户通知中心。
- `/auth`: Supabase 登录与鉴权回调处理。

### 关键功能
- **发送信件 (Send)**: 选择 Spotify 轨道，添加消息，并可选添加 “Flowing Emoji” 动画。
- **搜索探索 (Explore)**: 按分类（Love, Friendship, Family）搜索并过滤公开信件。
- **历史记录 (History)**: 管理已发送的信件及已同步的游客信件。
- **高级特权 (Premium)**: 订阅制权益（免广告、解锁 Flowing Emoji、无限发送）。
- **用户识别**: 实现从游客（匿名 ID）到注册用户（Supabase Auth）的平滑过渡。

## 🛠 功能状态与用户识别
本项目目前通过双层系统管理用户身份：
1. **匿名模式**: 通过持久化局部 ID 跟踪游客。
2. **鉴权模式**: 登录后将本地历史记录同步至 Supabase。
3. **会员逻辑**: 通过 `users` 表中的 `is_premium` / `is_admin` 字段进行权限控制。

## 🛠 扩展性与架构优化 (边缘缓存)

### **2026-05-06: 实施 Cloudflare Workers 读取缓存 (第一阶段)**
为了应对高并发流量并防止 Supabase 触发免费额度限制，我们上线了针对 `letters` 表的读取缓存层。
- **技术实现**: Cloudflare Workers + Cloudflare KV。
- **核心逻辑**: 拦截所有针对信件详情的 `GET` 请求，并将数据缓存至 KV 中，有效期 1 小时。
- **成效**: 显著降低了 Supabase 的负载，提升了全球访问速度。

### **第二阶段：R2 静态化 (计划中)**
启动实施的条件：
- 日活跃用户 (DAU) 稳定超过 10,000。
- 需要将热门信件彻底脱离数据库运行，保证在数据库宕机时仍可访问。
- 目标：通过 Cloudflare R2 存储静态 HTML 文件，实现零流量费和永久存储。

## 🧹 维护与清理
(详情请参考 `ARCH_CLEANUP_PLAN.md` 了解优化路线图)

`/src/app` 中存在的大量 `debug-*` 和 `test-*` 路由是开发阶段留下的诊断工具。在核心功能验证完成后，建议清理这些目录以保持项目整洁。

## 📜 许可证
© 2026 FlowithMusic. 版权所有。
