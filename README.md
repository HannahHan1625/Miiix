# Miiix

Miiix 是一个面向独居者和小家庭的冰箱库存与菜谱生成 MVP。当前版本包含：

- 冰箱库存管理
- 食材、厨具、菜谱的透明切图资产系统
- 厨具选择与食谱推荐
- 收藏、想做清单、我的菜谱
- 制作步骤翻转卡片
- iOS App 工程壳，基于 Capacitor 承载现有 React/Vite MVP

当前工程版本为 `v0.4.1 持久化纵向链路`。浏览器端已通过 IndexedDB Repository Adapter 持久化库存、收藏、菜谱、今日计划、购物清单、制作记录和库存流水；真实 Supabase 项目与跨设备同步仍属于后续工作。

## 项目交接

v0.4.1 已冻结功能范围。继续项目之前必须先读：

- [`v0.4.1 项目交接`](docs/handoff/v0.4.1-project-handoff.md)
- [`Miiix PRD v0.4.1`](docs/product/miiix-prd-v0.4.1.md)
- [`v0.4.2 新会话启动 Prompt`](docs/handoff/v0.4.2-session-prompt.md)

下一版本只建设食材主数据：先完成并校验 30 个黄金样本，再决定如何扩展到首批 200 个；不新增页面或 AI 功能。

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

## 测试

```bash
pnpm run test
pnpm run check:migrations
```

纵向集成测试覆盖：新增库存、刷新恢复、创建今日计划、完成制作、扣减库存、重复提交防重和再次刷新恢复。

## 数据库

本地验证使用 IndexedDB，目标云数据库采用 Supabase PostgreSQL。页面和业务服务只依赖 Repository 合同，因此未来替换存储时不需要重写产品页面。数据库定义、迁移顺序和非技术说明见：

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
