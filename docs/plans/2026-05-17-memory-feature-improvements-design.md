# 记忆功能改进设计文档

**日期:** 2026-05-17
**作者:** AI Assistant
**状态:** 待审批

---

## 概述

本文档描述了对记忆功能的多项改进，包括 UI 优化、中文化、智能体详情集成和 Bug 修复。

---

## 需求列表

### 1. 移除设置记忆中的 List 视图

**原因:** List 视图功能与 Table/Timeline 视图重复，移除以简化 UI。

**修改内容:**
- `packages/views/settings/components/memories-tab.tsx`
  - 删除 `MemoryViewMode` 类型中的 `"list"` 选项
  - 删除 `<Tabs>` 组件及其切换逻辑
  - 默认直接显示 `MemoryGraphPage` 组件

---

### 2. 重命名"记忆图谱"为"空间记忆地图"

**原因:** 更准确地反映功能定位。

**修改内容:**
- `packages/views/locales/zh-Hans/memories.json`
  - `graph_title`: "空间记忆地图"
- `packages/views/locales/en/memories.json`
  - `graph_title`: "Spatial Memory Map"

---

### 3. 记忆链接类型中文化

**原因:** 统一界面语言为中文。

**翻译映射:**
| 英文 | 中文 |
|------|------|
| Semantic | 语义链接 |
| Temporal | 时间链接 |
| Entity | 实体链接 |
| Causal | 因果链接 |

**修改内容:**
- `packages/views/locales/zh-Hans/memories.json` - 添加翻译键
- `packages/views/settings/components/cytoscape-graph.tsx` - 使用 i18n 翻译显示链接类型

---

### 4. 智能体详情添加"认知记忆"tab

**原因:** 让用户在智能体详情页直接查看该智能体的认知记忆。

**功能描述:**
- 在智能体详情页面的左侧 inspector 面板中添加新 tab 页签
- Tab 名称："认知记忆"
- 内容：与设置中的记忆图谱完全相同的 UI
- 默认查询条件：标签为 `agent:{agentId}`

**修改内容:**
- `packages/views/agents/components/agent-detail-inspector.tsx`
  - 添加新的 tab 切换 UI
  - 添加 `CognitiveMemoryTab` 组件
- 新建 `packages/views/agents/components/cognitive-memory-tab.tsx`
  - 复用 `MemoryGraphPage` 的逻辑
  - 初始化时自动设置 `selectedTags: ["agent:{agentId}"]`

**标签格式:**
```
agent:46958ad5-a4d3-4e22-984e-e308d5b25187
```

---

### 5. 修复记忆图谱搜索和标签无法触发查询的 bug

**问题描述:** 在记忆图谱中，搜索框输入关键词或添加/删除标签时，不会触发 API 重新查询。

**根本原因:** `useMemoryGraph` hook 的查询参数没有包含 `searchQuery` 和 `selectedTags`，导致这些值变化时 React Query 不会重新触发查询。

**修改内容:**
- `packages/core/memory/hooks.ts`
  - 修改 `useMemoryGraph` hook，在 queryKey 中添加 `query` 和 `tags` 参数
  - 修改请求参数，将 `q` 和 `tags` 传递给 API
- `packages/views/settings/components/memory-graph-page.tsx`
  - 将 `searchQuery` 和 `selectedTags` 传递给 `useMemoryGraph` hook

---

### 6. 添加记忆类型筛选功能

**需求描述:** 在记忆图谱中添加记忆类型筛选器，支持三种类型：
1. **Observation（观察）** - 默认选中
2. **Experience（经验）**
3. **Fact（事实）**

**修改内容:**
- `packages/core/memory/graph-store.ts`
  - 添加 `selectedMemoryTypes: string[]` 状态
  - 添加 `toggleMemoryType` 和 `setMemoryTypes` 动作
  - `initialState` 中设置 `selectedMemoryTypes: ["observation"]`（默认选中观察）
- `packages/views/settings/components/memory-filters.tsx`
  - 添加记忆类型选择器 UI（类似 Link Types 的切换按钮）
- `packages/core/memory/hooks.ts`
  - 修改 `useMemoryGraph` 支持 `types` 参数（数组格式）
- `packages/views/locales/zh-Hans/memories.json`
  - 添加翻译：
    - `type_observation`: "观察"
    - `type_experience`: "经验"（已有）
    - `type_fact`: "事实"

---

## 架构图

### 组件关系

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentDetailPage                          │
│  ┌─────────────────────┐  ┌───────────────────────────────┐ │
│  │ AgentDetailInspector│  │     AgentOverviewPane         │ │
│  │  ┌─────────────────┐│  │                               │ │
│  │  │  Tabs           ││  │                               │ │
│  │  │  - Overview     ││  │                               │ │
│  │  │  - Config       ││  │                               │ │
│  │  │  - CognitiveMem ││  │                               │ │
│  │  └─────────────────┘│  │                               │ │
│  └─────────────────────┘  └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  CognitiveMemoryTab                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  MemoryGraphPage (复用)                                 ││
│  │    - 初始化时设置 selectedTags: ["agent:{id}"]          ││
│  │    - 其他逻辑与设置中的记忆图谱完全相同                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 数据流

### 记忆图谱查询流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   UI State   │────▶│  React Query │────▶│   API Call   │
│ (searchQuery,│     │  useMemory-  │     │  GET /api/   │
│  tags, types)│     │  Graph hook  │     │  memories/   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  Cache Key   │     │  Response    │
                     │  包含所有    │     │  {nodes,     │
                     │  筛选参数    │     │   edges,     │
                     └──────────────┘     │   table_rows}│
                                          └──────────────┘
```

---

## 测试计划

### 单元测试
1. `graph-store.ts` - 测试记忆类型状态管理
2. `cognitive-memory-tab.tsx` - 测试初始化时正确设置 agent 标签

### 集成测试
1. 记忆图谱搜索功能 - 验证搜索关键词变化时触发重新查询
2. 标签过滤功能 - 验证添加/删除标签时触发重新查询
3. 记忆类型筛选 - 验证切换类型时正确过滤

### E2E 测试
1. 智能体详情页 → 认知记忆 tab → 验证显示正确的记忆数据

---

## 实施顺序

1. **修复搜索 bug** (#9) - 优先级最高，影响现有功能
2. **添加记忆类型筛选** (#10) - 核心功能增强
3. **重命名记忆图谱** (#8) - 简单 UI 修改
4. **链接类型中文化** (#13) - 简单翻译
5. **移除 List 视图** (#7) - 简单删除
6. **智能体认知记忆 tab** (#11) - 新功能，依赖前面完成

---

## 风险与依赖

### 风险
1. API 可能不支持多类型查询 - 需要后端配合
2. 智能体标签格式需要与后端确认一致性

### 依赖
- 后端 API 需要支持 `types` 参数（数组）
- 后端需要支持按 `tags` 过滤记忆

---

## 验收标准

- [ ] List 视图已移除
- [ ] "记忆图谱"显示为"空间记忆地图"
- [ ] 链接类型显示为中文
- [ ] 智能体详情页有"认知记忆"tab，默认显示该 agent 的记忆
- [ ] 搜索框输入关键词能触发查询
- [ ] 添加/删除标签能触发查询
- [ ] 记忆类型筛选器显示三种类型，默认选中"观察"
