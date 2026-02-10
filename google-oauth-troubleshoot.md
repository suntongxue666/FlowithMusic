## Google OAuth 配置问题排查

根据你的反馈，Google登录本地测试失败。以下是需要检查的配置项：

### 1. Supabase项目设置
访问你的Supabase项目: https://supabase.com/dashboard/project/oiggdnnehohoaycyiydn

#### Authentication > Providers > Google
需要确保：
- ✅ Google Provider 已启用
- ✅ Client ID: `172018754881-af18pu0sfae96afspveau3v8qrc9d0v3.apps.googleusercontent.com`
- ✅ Client Secret: `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`

#### Authentication > URL Configuration
需要添加重定向URL：
- ✅ `http://localhost:3000/auth/callback`
- ✅ `http://localhost:3000/**` (可选，用于开发)

### 2. Google Cloud Console设置
访问: https://console.cloud.google.com/apis/credentials

#### OAuth 2.0 客户端ID配置
需要确保授权重定向URI包含：
- ✅ `http://localhost:3000/auth/callback`
- ✅ `https://oiggdnnehohoaycyiydn.supabase.co/auth/v1/callback`

### 3. 测试页面
访问: http://localhost:3000/test-google-auth
这个页面会提供详细的错误诊断信息。

### 4. 常见错误及解决方案

#### Error: "redirect_uri_mismatch"
- 检查Google Cloud Console中的重定向URI配置
- 确保包含 `http://localhost:3000/auth/callback`

#### Error: "Invalid client"
- 检查Google Client ID和Secret是否正确
- 确保在Supabase中正确配置

#### Error: "Provider not enabled"
- 在Supabase项目中启用Google Provider

请先访问测试页面查看具体错误信息，然后我们可以针对性解决。