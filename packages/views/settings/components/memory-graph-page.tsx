"use client";

import { useEffect } from "react";
import { Brain, X } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { useMemoryGraph } from "@multica/core/memory/hooks";
import { useCurrentWorkspace } from "@multica/core/paths";
import { useT } from "../../i18n";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { MemoryFilters } from "./memory-filters";
import { CytoscapeGraph } from "./cytoscape-graph";
import { MemoryTableView } from "./memory-table-view";
import { MemoryTimelineView } from "./memory-timeline-view";
import { MemoryControlPanel } from "./memory-control-panel";
import { MemoryDetailPanel } from "./memory-detail-panel";

interface MemoryGraphPageProps {
  onClose?: () => void;
}

export function MemoryGraphPage({ onClose }: MemoryGraphPageProps) {
  const { t } = useT("memories");
  const workspace = useCurrentWorkspace();

  // Zustand store state and actions
  const {
    graphData,
    searchQuery,
    selectedTags,
    viewMode,
    nodeLimit,
    selectedNodeId,
    setSearchQuery,
    addTag,
    removeTag,
    setViewMode,
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

  if (!workspace) return null;

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Top Bar: Title, Filters, Close */}
      <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">{t(($) => $.graph_title) || "Memory Graph"}</h2>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters Component */}
        <MemoryFilters
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          viewMode={viewMode}
          onSearchChange={setSearchQuery}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onViewModeChange={setViewMode}
        />
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
                <CytoscapeGraph data={graphData} />
              )}
              {viewMode === "table" && graphData?.table_rows && (
                <MemoryTableView data={graphData.table_rows} />
              )}
              {viewMode === "timeline" && graphData?.table_rows && (
                <MemoryTimelineView data={graphData.table_rows} />
              )}
            </div>
          )}
        </div>

        {/* Right Side: Detail Panel + Control Panel */}
        <div className="flex">
          {/* Detail Panel (shown when node selected) */}
          {selectedNodeId && graphData?.table_rows && (
            <MemoryDetailPanel data={graphData.table_rows} />
          )}

          {/* Control Panel (always shown) */}
          <MemoryControlPanel />
        </div>
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
