# Miiix iOS App Runbook

## 当前决策

Miiix 第一版 iOS App 采用 Capacitor 路线：保留现有 React/Vite MVP，用原生 iOS 容器承载。这样可以最快进入手机真机和 TestFlight 验证，不急着重写 SwiftUI。

## 已完成

- 已安装 Capacitor 依赖：`@capacitor/core`、`@capacitor/cli`、`@capacitor/ios`
- 已生成 Capacitor 配置：`capacitor.config.ts`
- 已生成 iOS 原生工程：`ios/App/App.xcodeproj`
- 已把当前 Web MVP 同步到 iOS 工程：`ios/App/App/public`
- 已补 iOS WebView 需要的 viewport 和 Apple mobile meta
- 已新增脚本：
  - `pnpm run ios:sync`
  - `pnpm run ios:open`
  - `pnpm run ios:doctor`

## 当前机器状态

当前机器只有 Apple Command Line Tools，没有完整 Xcode。

这意味着：

- 可以继续开发 Web MVP
- 可以继续同步 Capacitor iOS 工程
- 暂时不能用 Xcode 打开、编译、运行 iOS 模拟器
- 暂时不能真机调试或提交 TestFlight

## 你下一步必须做

1. 从 Mac App Store 安装 Xcode。
2. 打开 Xcode 一次，接受协议并让它安装组件。
3. 回到项目目录运行：

```bash
pnpm run ios:open
```

这条命令会先构建 Web，再同步 iOS 工程，然后打开 Xcode。

## 装好 Xcode 后的验证标准

- Xcode 能打开 `ios/App/App.xcodeproj`
- 选择一个 iPhone Simulator
- 点击 Run 后能看到 Miiix App
- App 首屏直接进入“冰箱库存”
- 底部导航包含：库存、厨具、收藏、我的菜谱、清单

## 什么时候需要付费 Apple Developer Program

现在不需要。

需要以下动作时再注册付费账号：

- 用 TestFlight 发给别人测试
- 在真实 iPhone 上长期安装调试
- 准备上架 App Store
- 使用需要正式签名的 Apple 能力
