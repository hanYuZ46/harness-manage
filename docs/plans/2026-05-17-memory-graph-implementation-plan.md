# Memory Graph Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Multica 实现记忆图谱可视化界面，支持 Graph/Table/Timeline 三视图切换，提供完整的记忆浏览和过滤功能。

**Architecture:** 基于现有 `cytoscape-graph.tsx` 组件扩展，使用 Zustand 管理全局状态，通过 TanStack Query 获取数据，三视图共享同一份过滤状态。

**Tech Stack:** React, TypeScript, Zustand, TanStack Query, TanStack Table, Cytoscape.js, cytoscape-fcose

---

## Phase 1: Zustand Store + 基础布局

### Task 1: 创建记忆图谱 Zustand Store

**Files:**
- Create: `packages/core/memory/graph-store.ts`
- Test: `packages/core/memory/graph-store.test.ts`

**Step 1: Write the store implementation**

```typescript
import { create } from 'zustand';
import type { MemoryGraphResponse } from '../types';

interface MemoryGraphState {
  // Data
  graphData: MemoryGraphResponse | null;

  // Filters
  searchQuery: string;
  selectedTags: string[];
  selectedLinkTypes: string[];

  // View
  viewMode: 'graph' | 'table' | 'timeline';
  nodeLimit: number;
  showLabels: boolean;

  // Selection
  selectedNodeId: string | null;
  focusedNodeId: string | null;

  // Actions
  setGraphData: (data: MemoryGraphResponse | null) => void;
  setSearchQuery: (query: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
  setViewMode: (mode: 'graph' | 'table' | 'timeline') => void;
  setNodeLimit: (limit: number) => void;
  toggleShowLabels: () => void;
  setSelectedNode: (id: string | null) => void;
  setFocusedNode: (id: string | null) => void;
  toggleLinkType: (type: string) => void;
  reset: () => void;
}

const initialState = {
  graphData: null,
  searchQuery: '',
  selectedTags: [],
  selectedLinkTypes: ['semantic', 'temporal', 'entity', 'causal'],
  viewMode: 'graph' as const,
  nodeLimit: 30,
  showLabels: true,
  selectedNodeId: null,
  focusedNodeId: null,
};

export const useMemoryGraphStore = create<MemoryGraphState>((set) => ({
  ...initialState,

  setGraphData: (data) => set({ graphData: data }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  addTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags
        : [...state.selectedTags, tag],
    })),

  removeTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.filter((t) => t !== tag),
    })),

  clearTags: () => set({ selectedTags: [] }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setNodeLimit: (limit) => set({ nodeLimit: Math.max(20, Math.min(50, limit)) }),

  toggleShowLabels: () => set((state) => ({ showLabels: !state.showLabels })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  setFocusedNode: (id) => set({ focusedNodeId: id }),

  toggleLinkType: (type) =>
    set((state) => ({
      selectedLinkTypes: state.selectedLinkTypes.includes(type)
        ? state.selectedLinkTypes.filter((t) => t !== type)
        : [...state.selectedLinkTypes, type],
    })),

  reset: () => set(initialState),
}));
```

**Step 2: Write basic tests**

```typescript
import { describe, it, expect } from 'vitest';
import { useMemoryGraphStore } from './graph-store';

describe('useMemoryGraphStore', () => {
  it('should initialize with default state', () => {
    const state = useMemoryGraphStore.getState();
    expect(state.viewMode).toBe('graph');
    expect(state.nodeLimit).toBe(30);
    expect(state.selectedTags).toEqual([]);
  });

  it('should add tag correctly', () => {
    const { addTag, selectedTags } = useMemoryGraphStore.getState();
    addTag('agent');
    expect(useMemoryGraphStore.getState().selectedTags).toContain('agent');
  });

  it('should not add duplicate tags', () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().addTag('agent');
    useMemoryGraphStore.getState().addTag('agent');
    expect(useMemoryGraphStore.getState().selectedTags).toHaveLength(1);
  });

  it('should remove tag correctly', () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().addTag('agent');
    useMemoryGraphStore.getState().removeTag('agent');
    expect(useMemoryGraphStore.getState().selectedTags).toEqual([]);
  });

  it('should clamp node limit between 20-50', () => {
    useMemoryGraphStore.getState().setNodeLimit(10);
    expect(useMemoryGraphStore.getState().nodeLimit).toBe(20);
    useMemoryGraphStore.getState().setNodeLimit(60);
    expect(useMemoryGraphStore.getState().nodeLimit).toBe(50);
  });
});
```

**Step 3: Run tests to verify they pass**

Run: `pnpm --filter @multica/core exec vitest run memory/graph-store.test.ts`
Expected: 5/5 passing

**Step 4: Commit**

```bash
git add packages/core/memory/graph-store.ts packages/core/memory/graph-store.test.ts
git commit -m "feat(memory): add Zustand store for memory graph state"
```

---

### Task 2: 创建记忆图谱主页面组件

**Files:**
- Create: `packages/views/settings/components/memory-graph-page.tsx`
- Modify: `packages/views/settings/components/memory-graph.tsx` (refactor to use new structure)

**Step 1: Create the main page component**

```tsx
"use client";

import React, { useEffect } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useMemoryGraph } from "@multica/core/memory/hooks";
import { useCurrentWorkspace } from "@multica/core/paths";
import { MemoryFilters } from "./memory-filters";
import { MemoryGraphView } from "./memory-graph-view";
import { MemoryTableView } from "./memory-table-view";
import { MemoryTimelineView } from "./memory-timeline-view";
import { MemoryControlPanel } from "./memory-control-panel";
import { MemoryDetailPanel } from "./memory-detail-panel";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Brain } from "lucide-react";

export function MemoryGraphPage() {
  const workspace = useCurrentWorkspace();
  const { viewMode, setGraphData, selectedLinkTypes, nodeLimit } = useMemoryGraphStore();

  const { data: graphData, isLoading, error } = useMemoryGraph(workspace?.id ?? "", {
    limit: 1000,
    type: "experience",
  });

  // Sync data to store
  useEffect(() => {
    if (graphData) {
      setGraphData(graphData);
    }
  }, [graphData, setGraphData]);

  if (!workspace) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Top Filters */}
      <MemoryFilters />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* View Area */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 animate-spin" />
                    <span>加载中...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="p-6 text-center text-destructive">
                  <p>加载失败</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && !error && (!graphData?.nodes || graphData.nodes.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无记忆数据</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && !error && graphData && graphData.nodes.length > 0 && (
            <>
              {viewMode === 'graph' && <MemoryGraphView />}
              {viewMode === 'table' && <MemoryTableView />}
              {viewMode === 'timeline' && <MemoryTimelineView />}
            </>
          )}
        </div>

        {/* Right Control Panel */}
        <MemoryControlPanel />
      </div>

      {/* Detail Panel */}
      <MemoryDetailPanel />
    </div>
  );
}
```

**Step 2: Refactor existing memory-graph.tsx to export for compatibility**

```tsx
// Keep existing file for backward compatibility, re-export from new page
export { MemoryGraphPage as MemoryGraphView } from "./memory-graph-page";
```

**Step 3: Commit**

```bash
git add packages/views/settings/components/memory-graph-page.tsx
git commit -m "feat(memory): create main memory graph page component"
```

---

## Phase 2: 顶部过滤器组件

### Task 3: 实现顶部过滤器组件

**Files:**
- Create: `packages/views/settings/components/memory-filters.tsx`
- Test: `packages/views/settings/components/memory-filters.test.tsx`

**Step 1: Write the filter component**

```tsx
"use client";

import React, { useState, useCallback } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { Badge } from "@multica/ui/components/ui/badge";
import { Search, X, Brain, Graph, Table, Timeline } from "lucide-react";
import { useT } from "../../i18n";

export function MemoryFilters() {
  const { t } = useT("memory_graph");
  const {
    searchQuery,
    selectedTags,
    viewMode,
    setSearchQuery,
    addTag,
    removeTag,
    clearTags,
    setViewMode,
  } = useMemoryGraphStore();

  const [tagInput, setTagInput] = useState("");

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && tagInput.trim()) {
        e.preventDefault();
        addTag(tagInput.trim());
        setTagInput("");
      } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
        removeTag(selectedTags[selectedTags.length - 1]);
      }
    },
    [tagInput, selectedTags, addTag, removeTag]
  );

  const viewModes = [
    { value: "graph" as const, icon: Graph, label: t(($) => $.view_graph) },
    { value: "table" as const, icon: Table, label: t(($) => $.view_table) },
    { value: "timeline" as const, icon: Timeline, label: t(($) => $.view_timeline) },
  ] as const;

  return (
    <div className="flex items-center gap-4 p-4 border-b bg-background">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">{t(($) => $.title)}</h2>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <Input
          placeholder={t(($) => $.search_placeholder)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          prefix={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 px-2 py-0.5"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder={t(($) => $.add_tag)}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          className="w-32"
        />
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1">
        {viewModes.map(({ value, icon: Icon, label }) => (
          <Button
            key={value}
            variant={viewMode === value ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode(value)}
            className="gap-1"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Write basic tests**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryFilters } from './memory-filters';
import { useMemoryGraphStore } from '@multica/core/memory/graph-store';

describe('MemoryFilters', () => {
  it('should render title and search input', () => {
    render(<MemoryFilters />);
    expect(screen.getByText('记忆图谱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索记忆...')).toBeInTheDocument();
  });

  it('should update search query on input change', () => {
    render(<MemoryFilters />);
    const searchInput = screen.getByPlaceholderText('搜索记忆...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(useMemoryGraphStore.getState().searchQuery).toBe('test');
  });

  it('should add tag on Enter key', () => {
    render(<MemoryFilters />);
    const tagInput = screen.getByPlaceholderText('添加标签');
    fireEvent.change(tagInput, { target: { value: 'agent' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    expect(useMemoryGraphStore.getState().selectedTags).toContain('agent');
  });

  it('should remove tag on Backspace when input is empty', () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().addTag('test');
    render(<MemoryFilters />);
    const tagInput = screen.getByPlaceholderText('添加标签');
    fireEvent.keyDown(tagInput, { key: 'Backspace' });
    expect(useMemoryGraphStore.getState().selectedTags).not.toContain('test');
  });

  it('should switch view mode on button click', () => {
    render(<MemoryFilters />);
    const tableButton = screen.getByText('表格');
    fireEvent.click(tableButton);
    expect(useMemoryGraphStore.getState().viewMode).toBe('table');
  });
});
```

**Step 3: Run tests**

Run: `pnpm --filter @multica/views exec vitest run memory-filters.test.tsx`
Expected: 5/5 passing

**Step 4: Commit**

```bash
git add packages/views/settings/components/memory-filters.tsx packages/views/settings/components/memory-filters.test.tsx
git commit -m "feat(memory): add top filters component"
```

---

## Phase 3: Graph 视图优化

### Task 4: 优化 Cytoscape Graph 视图

**Files:**
- Modify: `packages/views/settings/components/cytoscape-graph.tsx:1-150`
- Create: `packages/views/settings/components/memory-graph-view.tsx`

**Step 1: Create wrapper component with enhanced features**

```tsx
"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import type { CytoscapeGraphProps } from "./cytoscape-graph";

export function MemoryGraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const { graphData, focusedNodeId, setSelectedNode, setFocusedNode, nodeLimit, showLabels } =
    useMemoryGraphStore();

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node.data?.id ?? null);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback((node: any) => {
    const nodeId = node.data?.id;
    if (focusedNodeId === nodeId) {
      setFocusedNode(null);
    } else {
      setFocusedNode(nodeId);
    }
  }, [focusedNodeId, setFocusedNode]);

  const handleBackgroundClick = useCallback(() => {
    setFocusedNode(null);
  }, [setFocusedNode]);

  useEffect(() => {
    // Initialize Cytoscape
    if (!containerRef.current || !graphData) return;

    const cytoscape = require("cytoscape");
    const fcose = require("cytoscape-fcose");
    fcose(cytoscape);

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: graphData.nodes.slice(0, nodeLimit).map((node) => ({
          data: { id: node.data.id, label: node.data.label },
        })),
        edges: graphData.edges?.slice(0, nodeLimit * 2).map((edge) => ({
          data: {
            source: edge.data.source,
            target: edge.data.target,
            linkType: edge.data.linkType,
          },
        })) ?? [],
      },
      layout: {
        name: "fcose",
        animate: "end",
        randomize: false,
        fit: true,
        padding: 50,
      } as any,
      style: [
        {
          selector: "node",
          style: {
            label: showLabels ? "data(label)" : "",
            "background-color": (node: any) => {
              const type = node.data("linkType") ?? "semantic";
              const colors: Record<string, string> = {
                semantic: "#0074d9",
                temporal: "#009296",
                entity: "#f59e0b",
                causal: "#8b5cf6",
              };
              return colors[type] ?? "#0074d9";
            },
            width: 40,
            height: 40,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": (edge: any) => {
              const type = edge.data("linkType") ?? "semantic";
              const colors: Record<string, string> = {
                semantic: "#0074d9",
                temporal: "#009296",
                entity: "#f59e0b",
                causal: "#8b5cf6",
              };
              return colors[type] ?? "#0074d9";
            },
            "line-style": (edge: any) => {
              const type = edge.data("linkType");
              if (type === "temporal") return "dashed";
              if (type === "causal") return "dotted";
              return "solid";
            },
          },
        },
        {
          selector: "node:focused",
          style: {
            "border-width": 4,
            "border-color": "#fff",
          },
        },
      ],
    });

    // Event handlers
    cy.on("tap", "node", (e: any) => handleNodeClick(e.target));
    cy.on("dblclick", "node", (e: any) => handleNodeDoubleClick(e.target));
    cy.on("tap", (e: any) => {
      if (e.target === cy) handleBackgroundClick();
    });

    cyRef.current = cy;

    return () => {
      (cy as any).destroy();
    };
  }, [graphData, nodeLimit, showLabels]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-muted/20"
      style={{ cursor: "grab" }}
    />
  );
}
```

**Step 2: Commit**

```bash
git add packages/views/settings/components/memory-graph-view.tsx
git commit -m "feat(memory): enhance graph view with focus mode and node limit"
```

---

## Phase 4: Table 视图

### Task 5: 实现 Table 视图组件

**Files:**
- Create: `packages/views/settings/components/memory-table-view.tsx`
- Test: `packages/views/settings/components/memory-table-view.test.tsx`

**Step 1: Write the table view component**

```tsx
"use client";

import React, { useMemo } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Badge } from "@multica/ui/components/ui/badge";
import { Button } from "@multica/ui/components/ui/button";

const columnHelper = createColumnHelper<any>();

export function MemoryTableView() {
  const { graphData, selectedNodeId, setSelectedNode } = useMemoryGraphStore();

  const columns = useMemo(
    () => [
      columnHelper.accessor("text", {
        header: "内容",
        cell: (info) => (
          <div className="truncate max-w-md" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor("entities", {
        header: "实体",
        cell: (info) => {
          const entities = info.getValue() ?? "";
          if (!entities) return null;
          return (
            <div className="flex gap-1 flex-wrap">
              {entities.split(", ").map((entity: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {entity.trim()}
                </Badge>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor("tags", {
        header: "标签",
        cell: (info) => (
          <div className="flex gap-1 flex-wrap">
            {info.getValue()?.map((tag: string, i: number) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs font-mono"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        ),
      }),
      columnHelper.accessor("fact_type", {
        header: "类型",
        cell: (info) => {
          const type = info.getValue() ?? "experience";
          const colors: Record<string, string> = {
            experience: "bg-blue-100 text-blue-800",
            world: "bg-green-100 text-green-800",
            opinion: "bg-purple-100 text-purple-800",
          };
          return (
            <Badge className={colors[type] ?? "bg-gray-100 text-gray-800"}>
              {type}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("mentioned_at", {
        header: "时间",
        cell: (info) => {
          const date = info.getValue();
          if (!date) return "-";
          return new Date(date).toLocaleDateString("zh-CN");
        },
      }),
    ],
    []
  );

  const data = useMemo(() => {
    if (!graphData?.table_rows) return [];
    return graphData.table_rows;
  }, [graphData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    onRowClick: (row) => {
      setSelectedNode(row.original.id);
    },
  });

  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="border rounded-md">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t hover:bg-muted/30 cursor-pointer ${
                  selectedNodeId === row.original.id ? "bg-muted/50" : ""
                }`}
                onClick={() => setSelectedNode(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          上一页
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {table.getState().pagination.pageIndex + 1} 页，共{" "}
          {table.getPageCount()} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/views/settings/components/memory-table-view.tsx
git commit -m "feat(memory): add table view with pagination"
```

---

## Phase 5: Timeline 视图

### Task 6: 实现 Timeline 视图组件

**Files:**
- Create: `packages/views/settings/components/memory-timeline-view.tsx`
- Test: `packages/views/settings/components/memory-timeline-view.test.tsx`

**Step 1: Write the timeline view component**

```tsx
"use client";

import React, { useMemo, useState } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Badge } from "@multica/ui/components/ui/badge";
import { Button } from "@multica/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MonthGroup {
  year: number;
  month: number;
  events: any[];
}

export function MemoryTimelineView() {
  const { graphData, setSelectedNode } = useMemoryGraphStore();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const groupedEvents = useMemo(() => {
    if (!graphData?.table_rows) return [];

    const groups: Map<string, MonthGroup> = new Map();

    graphData.table_rows.forEach((row) => {
      const date = row.mentioned_at ?? row.occurred_start;
      if (!date) return;

      const d = new Date(date);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;

      if (!groups.has(key)) {
        groups.set(key, {
          year,
          month,
          events: [],
        });
      }
      groups.get(key)!.events.push(row);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [graphData]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatMonth = (month: number) => {
    const months = [
      "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
      "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
    ];
    return months[month];
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      experience: "bg-blue-500",
      world: "bg-green-500",
      opinion: "bg-purple-500",
    };
    return colors[type ?? "experience"] ?? "bg-gray-500";
  };

  return (
    <div className="w-full h-full overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {groupedEvents.map((group) => {
          const key = `${group.year}-${group.month}`;
          const isExpanded = expandedMonths.has(key);

          return (
            <Card key={key}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-2 p-4 hover:bg-muted/30"
                  onClick={() => toggleMonth(key)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <span className="text-lg font-semibold">
                    {group.year}年 {formatMonth(group.month)}
                  </span>
                  <Badge variant="secondary">{group.events.length}</Badge>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    {group.events.map((event, idx) => (
                      <div
                        key={event.id || idx}
                        className="flex gap-3 p-4 hover:bg-muted/30 cursor-pointer border-l-2 ml-4"
                        style={{
                          borderLeftColor: getTypeColor(event.fact_type),
                        }}
                        onClick={() => setSelectedNode(event.id)}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(event.fact_type)}`} />
                        <div className="flex-1">
                          <p className="text-sm">{event.text}</p>
                          <div className="flex gap-2 mt-2">
                            {event.tags?.map((tag: string, i: number) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {groupedEvents.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              暂无时间线数据
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/views/settings/components/memory-timeline-view.tsx
git commit -m "feat(memory): add timeline view with month grouping"
```

---

## Phase 6: 右侧控制面板

### Task 7: 实现右侧控制面板组件

**Files:**
- Create: `packages/views/settings/components/memory-control-panel.tsx`

**Step 1: Write the control panel component**

```tsx
"use client";

import React from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Slider } from "@multica/ui/components/ui/slider";
import { Switch } from "@multica/ui/components/ui/switch";
import { Button } from "@multica/ui/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

const LINK_TYPE_COLORS: Record<string, string> = {
  semantic: "bg-[#0074d9]",
  temporal: "bg-[#009296]",
  entity: "bg-[#f59e0b]",
  causal: "bg-[#8b5cf6]",
};

const LINK_TYPE_LABELS: Record<string, string> = {
  semantic: "语义",
  temporal: "时间",
  entity: "实体",
  causal: "因果",
};

export function MemoryControlPanel() {
  const [collapsed, setCollapsed] = React.useState(false);
  const {
    graphData,
    selectedLinkTypes,
    nodeLimit,
    showLabels,
    setNodeLimit,
    toggleShowLabels,
    toggleLinkType,
  } = useMemoryGraphStore();

  const nodeCount = graphData?.nodes?.length ?? 0;
  const edgeCount = graphData?.edges?.length ?? 0;

  const linkTypeStats = React.useMemo(() => {
    const stats: Record<string, number> = {
      semantic: 0,
      temporal: 0,
      entity: 0,
      causal: 0,
    };
    graphData?.edges?.forEach((edge) => {
      const type = edge.data.linkType ?? "semantic";
      if (stats[type] !== undefined) {
        stats[type]++;
      }
    });
    return stats;
  }, [graphData]);

  if (collapsed) {
    return (
      <div className="w-12 border-l bg-background flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-background overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">控制面板</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(true)}
            className="p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">节点</span>
              <span className="font-medium">{nodeCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">边</span>
              <span className="font-medium">{edgeCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Link Types */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              链接类型
            </h4>
            {Object.entries(LINK_TYPE_COLORS).map(([type, color]) => (
              <div
                key={type}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm">{LINK_TYPE_LABELS[type]}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {linkTypeStats[type] ?? 0}
                </span>
              </div>
            ))}
            <div className="pt-2 space-y-1">
              {Object.keys(LINK_TYPE_COLORS).map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{LINK_TYPE_LABELS[type]}</span>
                  <Switch
                    checked={selectedLinkTypes.includes(type)}
                    onCheckedChange={() => toggleLinkType(type)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Node Limit */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex justify-between">
              <h4 className="text-xs font-medium text-muted-foreground">
                节点数量限制
              </h4>
              <span className="text-sm font-medium">{nodeLimit}</span>
            </div>
            <Slider
              value={[nodeLimit]}
              min={20}
              max={50}
              step={1}
              onValueChange={([value]) => setNodeLimit(value)}
            />
          </CardContent>
        </Card>

        {/* Show Labels */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">显示节点标签</span>
              <Switch
                checked={showLabels}
                onCheckedChange={toggleShowLabels}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/views/settings/components/memory-control-panel.tsx
git commit -m "feat(memory): add right control panel"
```

---

## Phase 7: 详情面板

### Task 8: 实现记忆详情面板组件

**Files:**
- Create: `packages/views/settings/components/memory-detail-panel.tsx`

**Step 1: Write the detail panel component**

```tsx
"use client";

import React from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useMemoryDetail } from "@multica/core/memory/hooks";
import { useCurrentWorkspace } from "@multica/core/paths";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Button } from "@multica/ui/components/ui/button";
import { Badge } from "@multica/ui/components/ui/badge";
import { X } from "lucide-react";

export function MemoryDetailPanel() {
  const workspace = useCurrentWorkspace();
  const { selectedNodeId, setSelectedNode } = useMemoryGraphStore();

  const { data: memoryDetail } = useMemoryDetail(
    workspace?.id ?? "",
    selectedNodeId ?? "",
    { enabled: !!selectedNodeId }
  );

  if (!selectedNodeId || !memoryDetail) return null;

  return (
    <div className="absolute top-20 right-4 w-80 max-h-[60vh] overflow-y-auto z-20">
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {memoryDetail.fact_type ?? "memory"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNode(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <p className="text-sm">{memoryDetail.text}</p>

          {/* Entities */}
          {memoryDetail.entities && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">实体</p>
              <div className="flex flex-wrap gap-1">
                {memoryDetail.entities.split(", ").map((entity: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {entity.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {memoryDetail.tags && memoryDetail.tags.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">标签</p>
              <div className="flex flex-wrap gap-1">
                {memoryDetail.tags.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs font-mono"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Time */}
          {(memoryDetail.occurred_start || memoryDetail.mentioned_at) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">时间</p>
              {memoryDetail.occurred_start && (
                <p className="text-xs text-muted-foreground">
                  发生：{new Date(memoryDetail.occurred_start).toLocaleDateString("zh-CN")}
                </p>
              )}
              {memoryDetail.mentioned_at && (
                <p className="text-xs text-muted-foreground">
                  提及：{new Date(memoryDetail.mentioned_at).toLocaleDateString("zh-CN")}
                </p>
              )}
            </div>
          )}

          {/* Context */}
          {memoryDetail.context && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">上下文</p>
              <p className="text-xs text-muted-foreground">{memoryDetail.context}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/views/settings/components/memory-detail-panel.tsx
git commit -m "feat(memory): add memory detail panel"
```

---

## Phase 8: i18n + 整合测试

### Task 9: 添加 i18n 翻译

**Files:**
- Modify: `packages/views/i18n/locales/zh.json`
- Modify: `packages/views/i18n/locales/en.json`

**Step 1: Add Chinese translations**

Add to `packages/views/i18n/locales/zh.json`:

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
    "loading": "加载中...",
    "error": "加载失败",
    "empty": "暂无记忆数据",
    "detail_panel": {
      "entities": "实体",
      "tags": "标签",
      "occurred": "发生时间",
      "mentioned": "提及时间",
      "context": "上下文"
    }
  }
}
```

**Step 2: Add English translations**

Add to `packages/views/i18n/locales/en.json`:

```json
{
  "memory_graph": {
    "title": "Memory Graph",
    "search_placeholder": "Search memories...",
    "add_tag": "Add tag",
    "view_graph": "Graph",
    "view_table": "Table",
    "view_timeline": "Timeline",
    "legend": "Legend",
    "nodes": "Nodes",
    "edges": "Edges",
    "link_types": "Link Types",
    "node_limit": "Node Limit",
    "show_labels": "Show Labels",
    "loading": "Loading...",
    "error": "Failed to load",
    "empty": "No memories yet",
    "detail_panel": {
      "entities": "Entities",
      "tags": "Tags",
      "occurred": "Occurred",
      "mentioned": "Mentioned",
      "context": "Context"
    }
  }
}
```

**Step 3: Commit**

```bash
git add packages/views/i18n/locales/*.json
git commit -m "feat(i18n): add memory graph translations"
```

---

### Task 10: 整合测试 + 类型检查

**Files:**
- All created files

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run tests**

Run: `pnpm test`
Expected: All tests passing

**Step 3: Manual verification**

1. Start backend: `make server`
2. Start frontend: `pnpm dev:web`
3. Navigate to Settings → Memory Graph
4. Verify:
   - Graph view renders correctly
   - Table view shows data with pagination
   - Timeline view groups by month
   - Filters work across all views
   - Control panel toggles link types
   - Detail panel shows memory details

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(memory): complete memory graph frontend implementation"
```

---

## Verification Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Graph view renders with focus mode
- [ ] Table view has pagination
- [ ] Timeline view groups by month
- [ ] Filters sync across views
- [ ] Control panel toggles work
- [ ] Detail panel shows correct data
- [ ] i18n translations correct (zh/en)

---

**Plan complete.** Two execution options:

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task with two-stage review
2. **Parallel Session** - Open new session with executing-plans

Which approach?
