# 玄机算命 - Capacitor Mobile App

基于 [Capacitor](https://capacitorjs.com/) 的玄机算命网 iOS/Android 原生应用，将现有 Flask Web 前端打包为移动 APP。

## 项目架构

```
suanming-app/                    ← 此仓库
├── capacitor.config.ts          Capacitor 配置
├── package.json                  依赖和构建脚本
├── scripts/
│   ├── sync-assets.sh           从 Flask 仓库复制前端资源
│   ├── patch-api-urls.js        重写 API URL + 平台差异处理
│   └── generate-icons.sh        生成多尺寸图标
├── src/js/
│   └── capacitor-init.js        原生插件初始化
├── docs/
│   └── github-actions-build.yml CI 配置（需手动添加到 .github/workflows/）
└── www/                          构建产物（gitignored）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 同步前端资源

```bash
# 默认从 /root/suanming 同步
npm run sync

# 或指定源目录
SUANMING_SOURCE=/path/to/suanming npm run sync
```

### 3. 修补 API URL

```bash
# Android 模式（保留百度广告）
npm run patch

# iOS 模式（移除百度广告）
node scripts/patch-api-urls.js --platform=ios
```

### 4. 一键构建

```bash
npm run build    # = sync + patch (默认 Android)
```

### 5. 初始化原生平台

```bash
# 需要先确保 www/ 目录有内容
npx cap add android
npx cap add ios
```

### 6. 同步到原生项目

```bash
npx cap sync
```

### 7. 运行/打开

```bash
# Android
npx cap open android    # 在 Android Studio 中打开
npx cap run android     # 在连接的设备上运行

# iOS（需要 macOS + Xcode）
npx cap open ios
npx cap run ios
```

## 广告策略

| 平台 | 百度广告 | 实现方式 |
|------|----------|----------|
| Android | ✅ 保留 | ads.js 正常加载 |
| iOS | ❌ 禁用 | patch 脚本移除广告引用和容器 |

## API 请求机制

- 所有 `fetch('/api/...')` 被重写为 `fetch(window.__API_BASE__ + '/api/...')`
- `window.__API_BASE__` 由 `api-config.js` 注入，生产环境指向 `https://xuanjisuanming.top`
- 本地开发时自动 fallback 到 `http://localhost:5000`
- `auth.js` 的 `API_BASE` 和 `fortune-api.js` 的 `getAPIBaseURL()` 均已适配

## CI/CD

由于 GitHub PAT 权限限制，workflow 文件无法通过 git push 直接推送。需手动操作：

1. 复制 `docs/github-actions-build.yml` 到 `.github/workflows/build.yml`
2. 在 GitHub 网页端创建文件，或使用具有 `workflow` scope 的 PAT

CI 构建：
- **Android**: ubuntu-latest → APK debug build
- **iOS**: macos-latest → 无签名 simulator build

## 原生插件

| 插件 | 用途 |
|------|------|
| @capacitor/haptics | 按钮触觉反馈 |
| @capacitor/splash-screen | 品牌启动屏 |
| @capacitor/status-bar | 暗色主题状态栏 |
| @capacitor/network | 离线检测 |
| @capacitor/app | Android 返回键 |
| @capacitor/preferences | 持久化存储 |

## 注意事项

- **不要使用 `server.url`**：Apple 拒绝纯远程加载的 APP
- **HTTPS 必须**：后端已配置 SSL，Android 9+ 阻止 HTTP
- **CORS 已开启**：Flask 后端无需修改
- **iOS 构建需要 macOS + Xcode**

## 后续计划

- [ ] 创建 1024x1024 应用图标
- [ ] 生成各尺寸图标和启动屏
- [ ] 配置 Firebase 推送通知
- [ ] 接入 AdMob（iOS 广告替代方案）
- [ ] 接入 RevenueCat（iOS 内购）
- [ ] 配置签名证书和发布流水线
