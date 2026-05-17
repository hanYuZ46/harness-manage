"use client";

import { useState, useCallback, useEffect } from "react";
import { Brain, X, Search, Plus } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { useMemoryGraph } from "@multica/core/memory/hooks";
import { useCurrentWorkspace } from "@multica/core/paths";
import { useT } from "../../i18n";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import type { MemoryGraphViewMode } from "@multica/core/memory/graph-store";
import type { MemoryGraphTableRow } from "@multica/core/types/memory";

interface MemoryGraphPageProps {
  onClose?: () => void;
}

export function MemoryGraphPage({ onClose }: MemoryGraphPageProps) {
  const { t } = useT("memories");
  const workspace = useCurrentWorkspace();
  const [tagInput, setTagInput] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  // Zustand store state and actions
  const {
    graphData,
    searchQuery,
    selectedTags,
    viewMode,
    nodeLimit,
    showLabels,
    selectedNodeId,
    setSearchQuery,
    addTag,
    removeTag,
    clearTags,
    setViewMode,
    setNodeLimit,
    toggleShowLabels,
    setSelectedNode,
    reset,
  } = useMemoryGraphStore();

  // Fetch graph data
  const { data: fetchedData, isLoading, error } = useMemoryGraph(workspace?.id ?? "", {
    limit: nodeLimit,
    type: "experience",
  });

  // Sync fetched data with Zustand store
  useEffect(() => {
    if (fetchedData) {
      useMemoryGraphStore.getState().setGraphData(fetchedData);
    }
  }, [fetchedData]);

  // Handle tag input
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && tagInput.trim()) {
        addTag(tagInput.trim());
        setTagInput("");
      } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
        removeTag(selectedTags[selectedTags.length - 1]!);
      }
    },
    [tagInput, selectedTags, addTag, removeTag]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDebounce);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce, setSearchQuery]);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: MemoryGraphViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  // Handle node selection
  const handleNodeClick = useCallback(
    (node: MemoryGraphTableRow) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  if (!workspace) return null;

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Top Bar: Title, Search, Tags, View Switcher */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">{t(($) => $.graph_title) || "Memory Graph"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              <Button
                variant={viewMode === "graph" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("graph")}
              >
                {t(($) => $.view_graph) || "Graph"}
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("table")}
              >
                {t(($) => $.view_table) || "Table"}
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("timeline")}
              >
                {t(($) => $.view_timeline) || "Timeline"}
              </Button>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search and Tags */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t(($) => $.search_placeholder) || "Search memories..."}
              value={searchDebounce}
              onChange={(e) => setSearchDebounce(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {selectedTags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="relative">
              <Input
                placeholder={t(($) => $.add_tag) || "Add tag..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="w-32 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => {
                  if (tagInput.trim()) {
                    addTag(tagInput.trim());
                    setTagInput("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* View Area */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="p-6 text-center text-destructive">
                  <p>{t(($) => $.graph_error) || "Failed to load graph"}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && !error && (!graphData?.nodes || graphData.nodes.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t(($) => $.graph_empty) || "No memories in graph"}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Render view based on mode */}
          {graphData && graphData.nodes.length > 0 && (
            <div className="w-full h-full">
              {viewMode === "graph" && (
                <div className="w-full h-full">
                  {/* TODO: Import and render CytoscapeGraph with Zustand integration */}
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Graph view - coming soon
                  </div>
                </div>
              )}
              {viewMode === "table" && (
                <div className="w-full h-full overflow-auto">
                  {/* TODO: Implement TableView */}
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Table view - coming soon
                  </div>
                </div>
              )}
              {viewMode === "timeline" && (
                <div className="w-full h-full overflow-auto">
                  {/* TODO: Implement TimelineView */}
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Timeline view - coming soon
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel (right side, shown when node selected) */}
        {selectedNodeId && (
          <div className="w-80 border-l border-border overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  {t(($) => $.detail_title) || "Memory Details"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* TODO: Implement MemoryDetailPanel */}
              <p className="text-sm text-muted-foreground">
                Select a node to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t(($) => $.nodes) || "Nodes"}: {graphData?.nodes.length ?? 0} |{" "}
            {t(($) => $.edges) || "Edges"}: {graphData?.edges?.length ?? 0}
          </span>
          <span>
            {t(($) => $.limit) || "Limit"}: {nodeLimit}
          </span>
        </div>
      </div>
    </div>
  );
}
