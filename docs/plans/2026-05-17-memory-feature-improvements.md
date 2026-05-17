# Memory Feature Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 6 memory feature improvements: remove List view, rename to Spatial Memory Map, translate link types to Chinese, add Cognitive Memory tab to agent detail, fix search/tag query bug, and add memory type filter.

**Architecture:** Frontend-only changes using existing React components, Zustand store for state management, React Query for data fetching, and i18n for translations.

**Tech Stack:** React, TypeScript, Zustand, TanStack Query, Next.js, shadcn/ui, i18n

---

## Task 1: Fix Search and Tag Query Bug (Priority: Highest)

**Files:**
- Modify: `packages/core/memory/hooks.ts`
- Modify: `packages/views/settings/components/memory-graph-page.tsx`

### Step 1: Read current hooks.ts implementation

```bash
cat packages/core/memory/hooks.ts
```

### Step 2: Update useMemoryGraph hook to include query and tags in queryKey

**Current issue:** queryKey doesn't include searchQuery and selectedTags, so changes don't trigger refetch.

**Fix:**
```typescript
export function useMemoryGraph(
  workspaceId: string,
  params?: {
    type?: "experience" | "world" | "opinion";
    limit?: number;
    q?: string;        // Add query parameter
    tags?: string[];   // Add tags parameter
  },
) {
  return useQuery(memoryGraphOptions(workspaceId, {
    ...params,
    q: params?.q,
    tags: params?.tags,
  }));
}
```

### Step 3: Update memoryGraphOptions to pass query and tags to API

```typescript
export function memoryGraphOptions(
  workspaceId: string,
  params?: {
    type?: "experience" | "world" | "opinion";
    limit?: number;
    q?: string;
    tags?: string[];
  },
) {
  return queryOptions({
    queryKey: memoryKeys.graph(workspaceId, params?.q, params?.tags), // Include in key
    queryFn: () => api.getMemoryGraph(workspaceId, params),
  });
}
```

### Step 4: Update memoryKeys to include query and tags

```typescript
export const memoryKeys = {
  all: () => ["memories"] as const,
  workspace: (workspaceId: string) => [...memoryKeys.all(), workspaceId] as const,
  workspaceQuery: (workspaceId: string, query: string) =>
    [...memoryKeys.workspace(workspaceId), query] as const,
  graph: (workspaceId: string, q?: string, tags?: string[]) =>
    [...memoryKeys.all(), "graph", workspaceId, q ?? "", tags?.join(",") ?? ""] as const,
  detail: (bankId: string, memoryId: string) => [...memoryKeys.all(), "detail", bankId, memoryId] as const,
};
```

### Step 5: Update memory-graph-page.tsx to pass searchQuery and selectedTags

```typescript
const { data: fetchedData, isLoading, error } = useMemoryGraph(workspace?.id ?? "", {
  limit: nodeLimit,
  type: "experience",
  q: searchQuery || undefined,
  tags: selectedTags.length > 0 ? selectedTags : undefined,
});
```

### Step 6: Test manually

1. Navigate to Settings → Memories → Graph
2. Type in search box - should trigger query
3. Add/remove tags - should trigger query

### Step 7: Commit

```bash
git add packages/core/memory/hooks.ts packages/core/memory/queries.ts packages/views/settings/components/memory-graph-page.tsx
git commit -m "fix(memory): include searchQuery and tags in useMemoryGraph queryKey"
```

---

## Task 2: Add Memory Type Filter

**Files:**
- Modify: `packages/core/memory/graph-store.ts`
- Modify: `packages/core/memory/hooks.ts`
- Modify: `packages/core/memory/queries.ts`
- Modify: `packages/views/settings/components/memory-filters.tsx`
- Modify: `packages/views/settings/components/memory-graph-page.tsx`
- Modify: `packages/views/locales/zh-Hans/memories.json`
- Modify: `packages/views/locales/en/memories.json`

### Step 1: Update graph-store.ts to add memory type state

```typescript
// Add to MemoryGraphState interface
selectedMemoryTypes: string[];

// Add to initialState
selectedMemoryTypes: ["observation"], // Default to observation

// Add actions
setMemoryTypes: (types: string[]) => {
  set({ selectedMemoryTypes: types });
},
toggleMemoryType: (type: string) => {
  const { selectedMemoryTypes } = get();
  if (selectedMemoryTypes.includes(type)) {
    if (selectedMemoryTypes.length > 1) {
      set({ selectedMemoryTypes: selectedMemoryTypes.filter((t) => t !== type) });
    }
  } else {
    set({ selectedMemoryTypes: [...selectedMemoryTypes, type] });
  }
},
```

### Step 2: Update hooks.ts to support types parameter

```typescript
export function useMemoryGraph(
  workspaceId: string,
  params?: {
    type?: "experience" | "world" | "opinion";
    types?: string[];  // Add multi-type support
    limit?: number;
    q?: string;
    tags?: string[];
  },
) {
  return useQuery(memoryGraphOptions(workspaceId, params));
}
```

### Step 3: Update queries.ts API types

```typescript
export interface MemoryGraphRequest {
  type?: "world" | "experience" | "opinion" | "observation" | "fact";
  types?: string[];  // Add multi-type support
  limit?: number;
  q?: string;
  tags?: string[];
  tags_match?: "any" | "all";
}
```

### Step 4: Add memory type selector to memory-filters.tsx

```typescript
// Add to props
selectedMemoryTypes: string[];
onToggleMemoryType: (type: string) => void;

// Add UI component (similar to view mode buttons)
<div className="flex items-center gap-1 border border-border rounded-md p-1">
  <Button
    variant={selectedMemoryTypes.includes("observation") ? "default" : "ghost"}
    size="sm"
    onClick={() => onToggleMemoryType("observation")}
  >
    {t(($) => $.type_observation) || "Observation"}
  </Button>
  <Button
    variant={selectedMemoryTypes.includes("experience") ? "default" : "ghost"}
    size="sm"
    onClick={() => onToggleMemoryType("experience")}
  >
    {t(($) => $.type_experience) || "Experience"}
  </Button>
  <Button
    variant={selectedMemoryTypes.includes("fact") ? "default" : "ghost"}
    size="sm"
    onClick={() => onToggleMemoryType("fact")}
  >
    {t(($) => $.type_fact) || "Fact"}
  </Button>
</div>
```

### Step 5: Update memory-graph-page.tsx to pass memory types

```typescript
const { selectedMemoryTypes } = useMemoryGraphStore();

const { data: fetchedData, isLoading, error } = useMemoryGraph(workspace?.id ?? "", {
  limit: nodeLimit,
  types: selectedMemoryTypes,
  q: searchQuery || undefined,
  tags: selectedTags.length > 0 ? selectedTags : undefined,
});
```

### Step 6: Add translations

**zh-Hans/memories.json:**
```json
{
  "type_observation": "观察",
  "type_experience": "经验",
  "type_fact": "事实"
}
```

**en/memories.json:**
```json
{
  "type_observation": "Observation",
  "type_experience": "Experience",
  "type_fact": "Fact"
}
```

### Step 7: Commit

```bash
git add packages/core/memory/graph-store.ts packages/core/memory/hooks.ts packages/core/memory/queries.ts packages/views/settings/components/memory-filters.tsx packages/views/settings/components/memory-graph-page.tsx packages/views/locales/zh-Hans/memories.json packages/views/locales/en/memories.json
git commit -m "feat(memory): add memory type filter with observation/experience/fact"
```

---

## Task 3: Rename Memory Graph to Spatial Memory Map

**Files:**
- Modify: `packages/views/locales/zh-Hans/memories.json`
- Modify: `packages/views/locales/en/memories.json`

### Step 1: Update Chinese translation

```json
{
  "graph_title": "空间记忆地图"
}
```

### Step 2: Update English translation

```json
{
  "graph_title": "Spatial Memory Map"
}
```

### Step 3: Test

1. Navigate to Settings → Memories
2. Verify title shows "空间记忆地图" in Chinese

### Step 4: Commit

```bash
git add packages/views/locales/zh-Hans/memories.json packages/views/locales/en/memories.json
git commit -m "feat(i18n): rename Memory Graph to Spatial Memory Map"
```

---

## Task 4: Translate Link Types to Chinese

**Files:**
- Modify: `packages/views/locales/zh-Hans/memories.json`
- Modify: `packages/views/locales/en/memories.json`
- Modify: `packages/views/settings/components/cytoscape-graph.tsx` (if link types are displayed)

### Step 1: Add link type translations

**zh-Hans/memories.json:**
```json
{
  "link_type_semantic": "语义链接",
  "link_type_temporal": "时间链接",
  "link_type_entity": "实体链接",
  "link_type_causal": "因果链接"
}
```

**en/memories.json:**
```json
{
  "link_type_semantic": "Semantic",
  "link_type_temporal": "Temporal",
  "link_type_entity": "Entity",
  "link_type_causal": "Causal"
}
```

### Step 2: Update cytoscape-graph.tsx to use translations

```typescript
// Wherever link types are displayed, use t() function
const getLinkTypeLabel = (type: string) => {
  switch (type) {
    case "semantic": return t(($) => $.link_type_semantic);
    case "temporal": return t(($) => $.link_type_temporal);
    case "entity": return t(($) => $.link_type_entity);
    case "causal": return t(($) => $.link_type_causal);
    default: return type;
  }
};
```

### Step 3: Commit

```bash
git add packages/views/locales/zh-Hans/memories.json packages/views/locales/en/memories.json packages/views/settings/components/cytoscape-graph.tsx
git commit -m "feat(i18n): translate link types to Chinese"
```

---

## Task 5: Remove List View

**Files:**
- Modify: `packages/views/settings/components/memories-tab.tsx`

### Step 1: Simplify memories-tab.tsx

**Remove:**
- `MemoryViewMode` type
- `viewMode` state
- `<Tabs>` component for List/Graph switching

**Keep:**
- Direct render of `MemoryGraphPage`

**New simplified version:**
```typescript
"use client";

import { Brain } from "lucide-react";
import { useCurrentWorkspace } from "@multica/core/paths";
import { useT } from "../../i18n";
import { MemoryGraphPage } from "./memory-graph-page";

export function MemoriesTab() {
  const { t } = useT("memories");
  const workspace = useCurrentWorkspace();

  if (!workspace) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">{t(($) => $.title)}</h2>
      </div>
      <MemoryGraphPage />
    </div>
  );
}
```

### Step 2: Remove unused imports

- Remove `useState`
- Remove `Tabs`, `TabsList`, `TabsTrigger`
- Remove `Search`, `Calendar`, `User`, `Network` icons if not used
- Remove `Input`, `Card`, `CardContent` if not used
- Remove `MemoryItem` type import

### Step 3: Test

1. Navigate to Settings → Memories
2. Verify only Graph view is shown
3. Verify no List/Graph tabs

### Step 4: Commit

```bash
git add packages/views/settings/components/memories-tab.tsx
git commit -m "refactor(memory): remove List view, keep only Graph/Table/Timeline views"
```

---

## Task 6: Add Cognitive Memory Tab to Agent Detail

**Files:**
- Create: `packages/views/agents/components/cognitive-memory-tab.tsx`
- Modify: `packages/views/agents/components/agent-detail-inspector.tsx`

### Step 1: Create CognitiveMemoryTab component

```typescript
"use client";

import { useEffect } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { MemoryGraphPage } from "../../settings/components/memory-graph-page";

interface CognitiveMemoryTabProps {
  agentId: string;
}

export function CognitiveMemoryTab({ agentId }: CognitiveMemoryTabProps) {
  const { setSelectedTags } = useMemoryGraphStore();

  // Initialize with agent tag
  useEffect(() => {
    const agentTag = `agent:${agentId}`;
    setSelectedTags([agentTag]);

    return () => {
      // Optional: clear tags on unmount
      setSelectedTags([]);
    };
  }, [agentId, setSelectedTags]);

  return <MemoryGraphPage />;
}
```

### Step 2: Add tab to agent-detail-inspector.tsx

Find the existing tabs section and add "Cognitive Memory":

```typescript
const tabs = [
  { id: "overview", label: t(($) => $.tab_overview) },
  { id: "config", label: t(($) => $.tab_config) },
  { id: "memory", label: t(($) => $.tab_cognitive_memory) },
];

// In render
{activeTab === "memory" && <CognitiveMemoryTab agentId={agent.id} />}
```

### Step 3: Add translations

**zh-Hans/agents.json:**
```json
{
  "tab_cognitive_memory": "认知记忆"
}
```

**en/agents.json:**
```json
{
  "tab_cognitive_memory": "Cognitive Memory"
}
```

### Step 4: Test

1. Navigate to `/agents/{agentId}`
2. Click on "认知记忆" tab
3. Verify it shows memories filtered by `agent:{agentId}` tag

### Step 5: Commit

```bash
git add packages/views/agents/components/cognitive-memory-tab.tsx packages/views/agents/components/agent-detail-inspector.tsx packages/views/locales/zh-Hans/agents.json packages/views/locales/en/agents.json
git commit -m "feat(agents): add Cognitive Memory tab to agent detail page"
```

---

## Testing Checklist

After all tasks are complete, run full verification:

```bash
make check
```

### Manual Testing

1. **Search Bug Fix:**
   - [ ] Search in memory graph triggers query
   - [ ] Adding/removing tags triggers query

2. **Memory Type Filter:**
   - [ ] Three type buttons show (观察/经验/事实)
   - [ ] Default selection is "观察"
   - [ ] Toggling types updates the graph

3. **Spatial Memory Map Rename:**
   - [ ] Title shows "空间记忆地图"

4. **Link Types Chinese:**
   - [ ] Link types display in Chinese

5. **List View Removed:**
   - [ ] No List tab visible
   - [ ] Only Graph/Table/Timeline views available

6. **Cognitive Memory Tab:**
   - [ ] Tab exists in agent detail
   - [ ] Shows memories for that agent only
   - [ ] Tag format is `agent:{uuid}`

---

## Implementation Order

1. Task 1: Fix Search Bug (foundational)
2. Task 2: Memory Type Filter (core feature)
3. Task 3: Rename (simple i18n)
4. Task 4: Link Types Chinese (simple i18n)
5. Task 5: Remove List View (cleanup)
6. Task 6: Cognitive Memory Tab (new feature)

Each task is independent and can be committed separately.
