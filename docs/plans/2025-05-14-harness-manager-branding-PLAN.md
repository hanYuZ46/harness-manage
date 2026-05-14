# Harness Manager 品牌化定制 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Multica 前端应用品牌化定制的 harness-manager，包括首页重定向、文案替换、页签修改和下载功能移除。

**Architecture:** 最小改动方案 - 通过 Middleware 实现首页重定向，创建品牌配置文件集中管理文案，使用辅助函数统一管理页签标题。

**Tech Stack:** Next.js 16, TypeScript, React, Chi router

---

## Task 1: 创建品牌配置文件

**Files:**
- Create: `apps/config/brand.ts`
- Test: `apps/config/__tests__/brand.test.ts` (如果存在测试目录)

**Step 1: Write the brand configuration file**

```typescript
// apps/config/brand.ts
export const brand = {
  name: "harness-manager",
  fullName: "Harness Manager",
  description: "多 Agent 协作平台 - 智能协作，高效交付",
  tagline: "AI 驱动的团队协作平台",
};
```

**Step 2: Directory check and creation**

Run: `mkdir -p apps/config`

**Step 3: Commit**

```bash
git add apps/config/brand.ts
git commit -m "feat(branding): add centralized brand configuration"
```

---

## Task 2: 创建页签标题辅助函数

**Files:**
- Create: `apps/utils/page-title.ts`
- Test: `apps/utils/__tests__/page-title.test.ts` (如果存在测试目录)

**Step 1: Write the page title utility function**

```typescript
// apps/utils/page-title.ts
import { brand } from "@/config/brand";

export function getPageTitle(title?: string): string {
  return title ? `${title} - ${brand.fullName}` : brand.fullName;
}
```

**Step 2: Directory check and creation**

Run: `mkdir -p apps/utils`

**Step 3: Commit**

```bash
git add apps/utils/page-title.ts
git commit -m "feat(branding): add page title utility function"
```

---

## Task 3: 实现 Middleware 首页重定向

**Files:**
- Modify: `apps/web/proxy.ts:48-52`

**Step 1: Read the current proxy function**

Run: `cat apps/web/proxy.ts`

**Step 2: Add homepage redirect logic for unauthenticated users**

在 `export function proxy(req: NextRequest)` 函数中，在现有的 pathname 解析和 session 检查代码之后，添加首页重定向逻辑：

```typescript
// 在 proxy 函数内部，existing code 之后添加
// Redirect to login if accessing homepage without authentication
const { pathname } = req.nextUrl;
if (pathname === "/" && !hasSession) {
  return NextResponse.redirect(new URL("/login", req.url));
}
```

这个逻辑应该放在 `const { pathname } = req.nextUrl;` 和 `const hasSession = req.cookies.has("multica_logged_in");` 这些代码之后，但在任何路由重定向之前。

**Step 3: Test the redirect logic**

本地测试：访问根路径 http://localhost:3000 不带 cookie，应该重定向到 /login，带上登录 cookie 后应该正常访问。

**Step 4: Commit**

```bash
git add apps/web/proxy.ts
git commit -m "feat(branding): redirect homepage to login for unauthenticated users"
```

---

## Task 4: 修改根 layout 的页签标题

**Files:**
- Modify: `apps/web/app/layout.tsx`

**Step 1: Read the current layout file**

Run: `cat apps/web/app/layout.tsx`

**Step 2: Add page title utility import and metadata configuration**

在文件顶部添加导入：

```typescript
import { getPageTitle } from "@/utils/page-title";
```

查找 layout 组件的 metadata 配置或 title 标签，将其修改为使用品牌标题。通常是添加 `metadata` 导出：

```typescript
export const metadata = {
  title: getPageTitle(),
};
```

如果没有 metadata，需要添加以上代码。

**Step 3: Verify title in browser**

Run: `pnpm dev` 并检查浏览器标签显示 "Harness Manager"

**Step 4: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat(branding): update root layout page title to use brand name"
```

---

## Task 5: 修改 Hero 区域的文案

**Files:**
- Modify: `apps/web/features/landing/components/landing-hero.tsx`

**Step 1: Read the hero component**

Run: `cat apps/web/features/landing/components/landing-hero.tsx`

**Step 2: Replace brand references with brand config**

1. 在文件顶部添加导入：
```typescript
import { brand } from "@/config/brand";
```

2. 查找所有 "Multica" 或 "multica" 的引用，替换为 `brand.name` 或 `brand.fullName`
3. 查找包含 "AI-native" 或类似产品描述的文案，替换为 `brand.description` 或 `brand.tagline`

主要替换位置：
- 产品名称显示
- Hero 标题/副标题
- 描述文本
- Call-to-action 按钮文本（如果硬编码了产品名）

**Step 3: Test hero section rendering**

Run: `pnpm dev` 并访问首页验证文案显示正确

**Step 4: Commit**

```bash
git add apps/web/features/landing/components/landing-hero.tsx
git commit -m "feat(branding): update hero section with harness-manager branding"
```

---

## Task 6: 修改登录页的文案

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`

**Step 1: Read the login page**

Run: `cat apps/web/app/(auth)/login/page.tsx`

**Step 2: Add brand config import and update text**

1. 在文件顶部添加导入：
```typescript
import { brand } from "@/config/brand";
```

2. 查找所有品牌相关的文案，替换为：
   - "Multica" → `brand.fullName`
   - 产品描述 → `brand.description` 或 `brand.tagline`

**Step 3: Test login page**

Run: `pnpm dev` 并访问 /login 验证文案显示正确

**Step 4: Commit**

```bash
git add apps/web/app/(auth)/login/page.tsx
git commit -m "feat(branding): update login page with harness-manager branding"
```

---

## Task 7: 修改页脚的文案

**Files:**
- Modify: `apps/web/features/landing/components/landing-footer.tsx`

**Step 1: Read the footer component**

Run: `cat apps/web/features/landing/components/landing-footer.tsx`

**Step 2: Add brand config import and update all text**

1. 在文件顶部添加导入：
```typescript
import { brand } from "@/config/brand";
```

2. 替换所有品牌相关引用：
   - 产品名称 → `brand.fullName`
   - 版权信息中的品牌名 → `brand.name`
   - Slogan/描述 → `brand.description`

**Step 3: Test footer rendering**

检查首页底部页脚显示正确的品牌信息

**Step 4: Commit**

```bash
git add apps/web/features/landing/components/landing-footer.tsx
git commit -m "feat(branding): update footer with harness-manager branding"
```

---

## Task 8: 修改关于页面的文案

**Files:**
- Modify: `apps/web/app/(landing)/about/page.tsx`

**Step 1: Read the about page**

Run: `cat apps/web/app/(landing)/about/page.tsx`

**Step 2: Update brand references**

1. 在文件顶部添加导入：
```typescript
import { brand } from "@/config/brand";
```

2. 替换所有品牌相关文案：
   - "Multica" → `brand.fullName`
   - 产品描述 → `brand.description`

**Step 3: Test about page**

Run: `pnpm dev` 并访问 /about 验证文案

**Step 4: Commit**

```bash
git add apps/web/app/(landing)/about/page.tsx
git commit -m "feat(branding): update about page with harness-manager branding"
```

---

## Task 9: 移除 Hero 区域的下载按钮

**Files:**
- Modify: `apps/web/features/landing/components/landing-hero.tsx`

**Step 1: Re-read the hero component**

Run: `cat apps/web/features/landing/components/landing-hero.tsx`

**Step 2: Comment out or remove download button**

查找 Hero 区域中指向 `/download` 的按钮或链接，注释掉或删除相关代码。常见模式：

```typescript
{/*
<Link href="/download" className="...">
  Download
</Link>
*/}
```

保留其他 CTA 按钮（如 "Get Started", "Login" 等）。

**Step 3: Verify download buttons are hidden**

访问首页，确认没有下载相关的按钮或链接可见。

**Step 4: Commit**

```bash
git add apps/web/features/landing/components/landing-hero.tsx
git commit -m "feat(branding): remove download button from hero section"
```

---

## Task 10: 移除页脚的下载链接

**Files:**
- Modify: `apps/web/features/landing/components/landing-footer.tsx`

**Step 1: Re-read the footer component**

Run: `cat apps/web/features/landing/components/landing-footer.tsx`

**Step 2: Comment out or remove download links**

查找指向 `/download` 或下载相关的链接，注释掉或删除：

```typescript
{/*
  <Link href="/download" className="...">
    Download
  </Link>
*/}
```

**Step 3: Verify footer has no download links**

检查首页底部页脚，确认没有下载链接可见。

**Step 4: Commit**

```bash
git add apps/web/features/landing/components/landing-footer.tsx
git commit -m "feat(branding): remove download links from footer"
```

---

## Task 11: 更新应用内其他组件的品牌引用

**Files:**
- Modify: 需要查找的应用内组件文件

**Step 1: Search for remaining "Multica" references in apps**

Run: `grep -r "Multica" apps/web --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"`

**Step 2: Review and update matches**

针对每个匹配：
1. 确认是否为品牌相关文案
2. 如果是，替换为使用 `brand` 配置文件
3. 如果不是（如代码注释、变量名等），保持不变

**Step 3: Test updated components**

运行 `pnpm dev` 测试修改的组件。

**Step 4: Commit each component file**

对每个修改的文件单独提交，或批量提交一个 commit：
```bash
git add apps/web/components/...
git commit -m "feat(branding): update brand references in app components"
```

---

## Task 12: 验证所有修改

**Step 1: Build the application**

Run: `pnpm build`

**Step 2: Run TypeScript check**

Run: `pnpm typecheck`

**Step 3: Run tests**

Run: `pnpm test`

**Step 4: Manual testing checklist**

- [ ] 未登录访问 `/` 重定向到 `/login`
- [ ] 首页 Hero 区域显示 "harness-manager" 和 "多 Agent 协作平台"
- [ ] 登录页显示正确的品牌信息
- [ ] 页脚显示正确的品牌信息
- [ ] 关于页面显示正确的品牌信息
- [ ] 首页没有下载按钮
- [ ] 页脚没有下载链接
- [ ] 浏览器标签显示 "Harness Manager"
- [ ] 登录后正常工作空间页面功能正常

**Step 5: Final commit if needed**

```bash
git add .
git commit -m "feat(branding): final verification and cleanup"
```

---

## 测试策略

### 单元测试
- 品牌配置文件：确保配置导出正确
- 页签标题函数：确保格式正确

### 集成测试
- Middleware 重定向：测试未登录和已登录场景
- 品牌文案：确保在各个组件中正确显示

### 手动测试
- 功能测试：登录、首页访问、各个页面显示
- 视觉测试：确认品牌化后的视觉效果

### 回归测试
- 确保现有功能不受影响
- 验证登录流程正常工作

---

## 回滚方案

如果需要回滚：

```bash
git reset --hard HEAD~12  # 回滚所有 branding commit
git push origin <branch> --force  # 强制推送（谨慎使用）
```

---

## 完成标准

1. 未登录访问 `/` 自动跳转到 `/login`
2. 所有品牌文案显示为 "harness-manager" 和 "多 Agent 协作平台"
3. 页签标题显示为 "Harness Manager"
4. 首页和页脚不再显示下载按钮/链接
5. 应用构建成功，无 TypeScript 错误
6. 所有测试通过
7. 手动测试验证所有功能正常
