# Miiix

Miiix 是一个面向独居者和小家庭的冰箱库存与菜谱生成 MVP。当前版本包含：

- 冰箱库存管理
- 食材、厨具、菜谱的透明切图资产系统
- 厨具选择与食谱推荐
- 收藏、想做清单、我的菜谱
- 制作步骤翻转卡片
- iOS App 工程壳，基于 Capacitor 承载现有 React/Vite MVP

## Web 开发

```bash
pnpm install
pnpm run dev
```

本地访问：

```text
http://localhost:5173/
```

## 构建

```bash
pnpm run build
```

## iOS

当前 iOS 路线采用 Capacitor。

```bash
pnpm run ios:sync
pnpm run ios:open
```

运行 iOS 模拟器需要完整 Xcode。详见：

```text
outputs/ios-app-runbook.md
```

