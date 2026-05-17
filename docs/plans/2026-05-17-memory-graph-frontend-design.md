# 记忆图谱前端设计文档

> **设计目标**: 参考 enn-memory 项目的前端实现，为 Multica 创建记忆图谱可视化界面，支持 Graph/Table/Timeline 三视图切换，提供完整的记忆浏览和过滤功能。

**创建日期**: 2026-05-17
**状态**: 待实现
**参考项目**: enn-memory (https://enn-memory.dev.ennew.com)

---

## 1. 架构设计

### 1.1 组件结构

```
packages/views/settings/components/
├── memory-graph-page.tsx        # 主页面（状态管理 + 布局）
├── memory-graph-view.tsx        # Graph 视图（Cytoscape 图谱）
├── memory-table-view.tsx        # Table 视图（记忆列表）
├── memory-timeline-view.tsx     # Timeline 视图（时间线）
├── memory-filters.tsx           # 顶部过滤器组件
├── memory-control-panel.tsx     # 右侧控制面板
└── memory-detail-panel.tsx      # 记忆详情面板
```

### 1.2 状态管理

使用 Zustand 创建全局状态存储，统一管理过滤条件、视图状态和选中节点：

```typescript
interface MemoryGraphState {
  // 数据
  graphData: MemoryGraphResponse | null;

  // 过滤条件
  searchQuery: string;
  selectedTags: string[];
  selectedLinkTypes: string[];  // semantic/temporal/entity/causal

  // 视图控制
  viewMode: 'graph' | 'table' | 'timeline';
  nodeLimit: number;            // 20-50
  showLabels: boolean;

  // 选中状态
  selectedNodeId: string | null;
  focusedNodeId: string | null;

  // 操作方法
  setSearchQuery: (query: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setViewMode: (mode: 'graph' | 'table' | 'timeline') => void;
  setSelectedNode: (id: string | null) => void;
  setFocusedNode: (id: string | null) => void;
  setNodeLimit: (limit: number) => void;
  toggleLinkType: (type: string) => void;
}
```

### 1.3 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                    MemoryGraphPage                          │
│  (加载数据 + 状态上下文 + 布局容器)                            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──→ MemoryFilters (顶部过滤器)
         │
         ├──→ 视图切换
         │    ├──→ MemoryGraphView (Cytoscape)
         │    ├──→ MemoryTableView (表格)
         │    └──→ MemoryTimelineView (时间线)
         │
         ├──→ MemoryControlPanel (右侧控制面板)
         │
         └──→ MemoryDetailPanel (详情面板)

数据源：useMemoryGraph(workspaceId, params) → 后端代理 → enn-memory-clients
```

---

## 2. 组件详细设计

### 2.1 MemoryGraphPage (主容器)

**职责**:
- 加载记忆图谱数据
- 提供 Zustand 状态上下文
- 渲染整体布局框架

**布局结构**:
```tsx
<div className="memory-graph-page">
  <MemoryFilters />           {/* 顶部固定 */}
  <div className="content-area">
    <ViewSwitcher />          {/* Graph/Table/Timeline */}
    <MemoryDetailPanel />     {/* 右侧详情 */}
  </div>
  <MemoryControlPanel />      {/* 右侧可折叠控制面板 */}
</div>
```

### 2.2 MemoryGraphView (Graph 视图)

**基于现有组件优化**:
- 复用 `packages/views/settings/components/cytoscape-graph.tsx`
- 新增功能:
  - 双击节点聚焦子图（高亮节点及其连接）
  - 背景点击重置聚焦状态
  - 节点悬停提示（tooltip）
  - 节点数量限制（20-50，防止 UI 卡顿）

**节点颜色映射**:
```typescript
const NODE_COLORS = {
  semantic: '#0074d9',    // 蓝色 - 主色
  temporal: '#009296',    // 青色 - 时间关系
  entity: '#f59e0b',      // 琥珀色 - 实体关系
  causal: '#8b5cf6',      // 紫色 - 因果关系
};
```

**边样式映射**:
```typescript
const EDGE_STYLES = {
  semantic: { color: '#0074d9', lineStyle: 'solid' },
  temporal: { color: '#009296', lineStyle: 'dashed' },
  entity: { color: '#f59e0b', lineStyle: 'solid' },
  causal: { color: '#8b5cf6', lineStyle: 'dotted' },
};
```

### 2.3 MemoryTableView (Table 视图)

**使用库**: TanStack Table (React Table v8)

**列定义**:
| 列名 | 字段 | 渲染方式 |
|------|------|----------|
| 内容 | text | 文本截断 + tooltip |
| 实体 | entities | 标签组 |
| 标签 | tags | 彩色标签 |
| 类型 | fact_type | Badge (experience/world/opinion) |
| 时间 | occurred_start / mentioned_at | 格式化日期 |
| 上下文 | context | 文本摘要 |

**功能**:
- 分页（每页 20 条）
- 排序（点击列头）
- 行点击选中（同步到详情面板）
- 空状态提示

### 2.4 MemoryTimelineView (Timeline 视图)

**实现方案**: 使用自定义时间线组件（避免额外依赖）

**数据结构**:
```typescript
interface TimelineEvent {
  id: string;
  text: string;
  timestamp: string;  // occurred_start 或 mentioned_at
  type: string;       // fact_type
  tags: string[];
}
```

**视觉设计**:
```
2026 年 5 月
├── 5/17
│   ├── [experience] 智能体完成了任务 MUL-123
│   └── [world] 项目 Multica 启动
├── 5/16
│   └── [opinion] 用户偏好暗色模式
└── 5/15
    └── ...
```

**功能**:
- 按月分组
- 点击事件显示详情
- 支持折叠/展开月份

### 2.5 MemoryFilters (顶部过滤器)

**组件布局**:
```
┌────────────────────────────────────────────────────────────┐
│ [🧠 记忆图谱]  [搜索框...]  [标签 1 ×] [标签 2 ×] [+]  │ Graph | Table | Timeline │
└────────────────────────────────────────────────────────────┘
```

**搜索框**:
- 防抖输入（300ms）
- 支持模糊匹配记忆内容
- 回车触发搜索

**标签输入**:
- 支持回车添加标签
- 退格删除最后一个标签
- 点击 × 删除指定标签
- 显示已选中标签列表

**视图切换按钮**:
- 按钮组样式
- 当前视图高亮
- 图标 + 文字

### 2.6 MemoryControlPanel (右侧控制面板)

**宽度**: 320px，支持折叠/展开

**内容区域**:

1. **图例统计**
   ```
   节点：25
   边：48
   ─────────
   Semantic: 12
   Temporal: 8
   Entity: 15
   Causal: 13
   ```

2. **链接类型过滤**
   ```
   ☑ Semantic (蓝色)
   ☑ Temporal (青色)
   ☑ Entity (琥珀色)
   ☑ Causal (紫色)
   ```

3. **显示控制**
   ```
   节点数量限制：[====●====] 30
   (范围：20-50)

   ☑ 显示节点标签
   ```

### 2.7 MemoryDetailPanel (记忆详情面板)

**触发方式**: 点击 Graph/Table/Timeline 中的任意节点/行

**显示内容**:
```
┌─────────────────────────┐
│ [experience]       [×] │
├─────────────────────────┤
│ 智能体 agent-001 完成   │
│ 了问题 MUL-123 的任务   │
│                        │
│ ─────────────────────  │
│ 实体                   │
│ [agent-001] [MUL-123] │
│                        │
│ ─────────────────────  │
│ 标签                   │
│ [#agent] [#task]      │
│                        │
│ ─────────────────────  │
│ 时间                   │
│ 2026-05-17            │
│                        │
│ ─────────────────────  │
│ 上下文                 │
│ task_execution        │
└─────────────────────────┘
```

---

## 3. API 接口

### 3.1 后端代理接口

| 接口 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/workspaces/{workspaceId}/memories/graph` | GET | `type`, `limit` | 获取图谱数据 |
| `/api/workspaces/{workspaceId}/memories/{memoryId}` | GET | - | 获取记忆详情 |
| `/api/workspaces/{workspaceId}/memories` | GET | `query`, `agent_id`, `tags` | 获取记忆列表 |

### 3.2 响应数据结构

```typescript
interface MemoryGraphResponse {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  table_rows: MemoryGraphTableRow[];
  total_units: number;
}

interface MemoryGraphNode {
  data: {
    id: string;
    label?: string;
    color?: string;
  };
}

interface MemoryGraphEdge {
  data: {
    source: string;
    target: string;
    color?: string;
    lineStyle?: string;
    linkType?: string;  // semantic/temporal/entity/causal
    weight?: number;
    similarity?: number;
  };
}

interface MemoryGraphTableRow {
  id: string;
  text: string;
  entities?: string;
  context?: string;
  tags: string[];
  occurred_start?: string;
  occurred_end?: string;
  mentioned_at?: string;
  date?: string;
  fact_type?: string;  // experience/world/opinion
  proof_count?: number;
}
```

---

## 4. 状态同步策略

### 4.1 统一过滤状态

所有视图共享同一份过滤状态：

```typescript
// 顶部过滤器修改状态 → 所有视图自动更新
state.setSearchQuery('智能体');  // Graph/Table/Timeline 同时过滤
state.addTag('agent');           // 三视图同时应用标签过滤
```

### 4.2 选中状态同步

```typescript
// Graph 中点击节点 → Table 高亮对应行 → Timeline 高亮对应事件
state.setSelectedNode(nodeId);

// 详情面板显示选中节点的完整信息
<MemoryDetailPanel nodeId={state.selectedNodeId} />
```

### 4.3 视图切换保持状态

```typescript
// 从 Graph 切换到 Table，保持搜索条件和选中状态
state.setViewMode('table');  // 不重置 filters 和 selectedNode
```

---

## 5. 错误处理

### 5.1 加载状态

```tsx
{isLoading && (
  <div className="skeleton-loader">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-8 w-3/4" />
  </div>
)}
```

### 5.2 错误状态

```tsx
{error && (
  <Card>
    <CardContent className="text-center">
      <p className="text-destructive">加载失败</p>
      <Button onClick={() => refetch()}>重试</Button>
    </CardContent>
  </Card>
)}
```

### 5.3 空状态

```tsx
{!isLoading && !error && graphData?.nodes.length === 0 && (
  <Card>
    <CardContent className="text-center">
      <Brain className="h-12 w-12 mx-auto opacity-50" />
      <p>暂无记忆数据</p>
    </CardContent>
  </Card>
)}
```

---

## 6. 响应式设计

### 6.1 桌面端（≥1024px）

- 控制面板固定右侧，支持折叠
- 详情面板悬浮显示

### 6.2 平板端（768px-1023px）

- 控制面板抽屉式（从右侧滑出）
- 详情面板全屏覆盖

### 6.3 移动端（<768px）

- 隐藏控制面板
- 视图切换按钮缩小
- 详情面板底部抽屉

---

## 7. 性能优化

### 7.1 数据预加载

```typescript
// 预加载记忆列表（Table 视图使用）
const { data: memories } = useMemories(workspaceId, {
  query: state.searchQuery,
  tags: state.selectedTags,
});
```

### 7.2 虚拟滚动

```tsx
// Table 视图使用虚拟滚动（TanStack Virtual）
<Virtualizer
  count={filteredRows.length}
  overscan={5}
  estimateSize={() => 50}
>
```

### 7.3 防抖处理

```tsx
// 搜索框防抖（300ms）
const debouncedQuery = useDebounce(state.searchQuery, 300);
```

### 7.4 节点数量限制

```tsx
// Graph 视图节点数量限制（防止卡顿）
const displayNodes = nodes.slice(0, state.nodeLimit);
```

---

## 8. 国际化

### 8.1 翻译键定义

```json
{
  "memory_graph": {
    "title": "记忆图谱",
    "search_placeholder": "搜索记忆...",
    "add_tag": "添加标签",
    "view_graph": "图谱",
    "view_table": "表格",
    "view_timeline": "时间线",
    "legend": "图例",
    "nodes": "节点",
    "edges": "边",
    "link_types": "链接类型",
    "node_limit": "节点数量限制",
    "show_labels": "显示标签",
    "detail_panel": {
      "entities": "实体",
      "tags": "标签",
      "occurred": "发生时间",
      "mentioned": "提及时间",
      "context": "上下文"
    },
    "empty": "暂无记忆数据",
    "error": "加载失败"
  }
}
```

### 8.2 使用方式

```tsx
const { t } = useT('memory_graph');
<h2>{t('title')}</h2>
<input placeholder={t('search_placeholder')} />
```

---

## 9. 测试策略

### 9.1 单元测试

- 过滤器组件交互测试
- 状态管理测试
- 视图切换测试

### 9.2 集成测试

- Graph 视图渲染测试
- Table 视图分页测试
- Timeline 视图时间分组测试

### 9.3 E2E 测试

- 完整用户流程：搜索 → 过滤 → 切换视图 → 查看详情

---

## 10. 验收标准

- [ ] Graph 视图正常渲染，支持节点点击/双击聚焦
- [ ] Table 视图正常渲染，支持分页/排序
- [ ] Timeline 视图正常渲染，支持月份折叠
- [ ] 三视图切换流畅，状态保持正确
- [ ] 过滤器工作正常，三视图同步更新
- [ ] 右侧控制面板功能完整
- [ ] 详情面板显示正确
- [ ] 响应式布局正常
- [ ] 中英文翻译正确
- [ ] 性能达标（1000 条数据下流畅）

---

## 11. 依赖项

### 11.1 已有依赖

- `cytoscape` - 图谱可视化
- `cytoscape-fcose` - 力导向布局算法
- `@tanstack/react-query` - 数据获取
- `@tanstack/react-table` - 表格功能
- `zustand` - 状态管理

### 11.2 新增依赖

无（使用现有依赖实现所有功能）

---

## 12. 实现顺序建议

1. **Phase 1**: 创建 Zustand store + 基础布局
2. **Phase 2**: 实现顶部过滤器组件
3. **Phase 3**: 优化 Graph 视图（聚焦/悬停/限制）
4. **Phase 4**: 实现 Table 视图
5. **Phase 5**: 实现 Timeline 视图
6. **Phase 6**: 实现右侧控制面板
7. **Phase 7**: 实现详情面板
8. **Phase 8**: 整合测试 + i18n

---

**下一步**: 使用 `writing-plans` skill 创建详细的实现计划文档。
