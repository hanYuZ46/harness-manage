# Harness Manager 品牌化定制方案

## 需求概述

1. **首页重定向**：未登录访问首页时重定向到登录页
2. **品牌替换**：将 "Multica" 替换为 "harness-manager"，描述改为"多 Agent 协作平台"
3. **页签名称**：修改为 "harness-manager"
4. **移除下载功能**：移除下载桌面端按钮（保留下载页面）

---

## 设计方案

### 方案 A：最小改动方案（推荐）

采用增量修改方式，利用现有代码结构，降低风险。

---

## 第一部分：首页重定向到登录页

### 实现方式

**使用 Middleware 重定向（推荐）**

在 `apps/web/proxy.ts` 中添加根路径检测逻辑：

```typescript
// 在函数 proxy 中添加
if (pathname === "/" && !hasSession) {
  // 未登录访问首页，重定向到登录页
  return NextResponse.redirect(new URL("/login", req.url));
}
```

**优势：**
- Middleware 在路由解析前执行，性能更好
- 与现有的登录状态检查逻辑一致
- 避免页面组件渲染后的二次跳转

**涉及文件：**
- `apps/web/proxy.ts`

---

## 第二部分：品牌配置与文案替换

### 品牌配置文件

创建品牌配置文件集中管理品牌信息：

**文件：** `apps/config/brand.ts`

```typescript
export const brand = {
  name: "harness-manager",
  fullName: "Harness Manager",
  description: "多 Agent 协作平台 - 智能协作，高效交付",
  tagline: "AI 驱动的团队协作平台",
};
```

### 文案替换位置

| 位置 | 文件路径 | 修改内容 |
|------|----------|----------|
| Hero 区域 | `apps/web/features/landing/components/landing-hero.tsx` | 替换产品名称和描述 |
| 登录页 | `apps/web/app/(auth)/login/page.tsx` | 替换产品名称和描述 |
| 页脚 | `apps/web/features/landing/components/landing-footer.tsx` | 替换产品名称和描述 |
| 关于页面 | `apps/web/app/(landing)/about/page.tsx` | 替换产品名称和描述 |
| 应用内 UI | 各个组件文件 | 通过品牌配置文件引用替换 |

---

## 第三部分：页签名称修改

### 修改位置

1. **根 layout** → `apps/web/app/layout.tsx`
2. **具体页面组件** → 各个页面文件中的标题设置
3. **动态页面的标题** → 通过 `useMetadata` 或页面配置设置

### 辅助函数设计

创建统一的 title 辅助函数：

**文件：** `apps/utils/page-title.ts`

```typescript
import { brand } from "@/config/brand";

export function getPageTitle(title?: string): string {
  return title ? `${title} - ${brand.fullName}` : brand.fullName;
}
```

### 页签名称配置

可通过 `next.config.ts` 或页面级 metadata 设置：

```typescript
// 在页面中
export const metadata = {
  title: pageTitle("登录"),
};
```

---

## 第四部分：移除下载功能

### 修改位置

| 位置 | 文件路径 | 修改内容 |
|------|----------|----------|
| Hero 区域下载按钮 | `apps/web/features/landing/components/landing-hero.tsx` | 注释或删除下载链接 |
| 页脚下载链接 | `apps/web/features/landing/components/landing-footer.tsx` | 注释或删除下载链接 |

### 处理方式

保留 `/download` 路由不变，只移除指向它的入口链接。

---

## 实施顺序

1. 创建品牌配置文件
2. 实现 Middleware 首页重定向
3. 创建页签标题辅助函数
4. 逐个替换文案内容
5. 移除下载按钮

---

## 文件清单

- `apps/config/brand.ts` (新建)
- `apps/utils/page-title.ts` (新建)
- `apps/web/proxy.ts` (修改)
- `apps/web/app/layout.tsx` (修改)
- `apps/web/features/landing/components/landing-hero.tsx` (修改)
- `apps/web/features/landing/components/landing-footer.tsx` (修改)
- `apps/web/app/(auth)/login/page.tsx` (修改)
- `apps/web/app/(landing)/about/page.tsx` (修改)

---

## 风险评估

- **低风险**：文案修改和下载按钮移除
- **中风险**：首页重定向逻辑（需要充分测试）
- **低风险**：页签名称修改

---

## 成功标准

1. 未登录访问 "/" 自动跳转到 "/login"
2. 所有品牌文案显示为 "harness-manager" 和 "多 Agent 协作平台"
3. 页签标题显示为 "harness-manager"
4. 首页和页脚不再显示下载按钮
