# Miiix

Miiix 是一个面向独居者和小家庭的冰箱库存与菜谱生成 MVP。当前版本包含：

- 冰箱库存管理
- 食材、厨具、菜谱的透明切图资产系统
- 厨具选择与食谱推荐
- 收藏、想做清单、我的菜谱
- 制作步骤翻转卡片
- iOS App 工程壳，基于 Capacitor 承载现有 React/Vite MVP

当前工程版本为 `v0.4.0 数据地基`。数据库 Schema、迁移和 Repository 合同已经建立，真实 Supabase 项目与数据导入仍属于后续工作。

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

## 数据库

目标数据库采用 Supabase PostgreSQL。数据库定义、迁移顺序和非技术说明见：

```text
database/README.md
```

检查迁移文件：

```bash
pnpm run check:migrations
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
