"use client";

import { useEffect } from "react";
import { Brain, Loader2 } from "lucide-react";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { useMemoryGraph } from "@multica/core/memory/hooks";
import { useWorkspaceId } from "@multica/core/hooks";
import { useT } from "../../i18n";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { MemoryFilters } from "./memory-filters";
import { CytoscapeGraph } from "./cytoscape-graph";
import { MemoryTableView } from "./memory-table-view";
import { MemoryTimelineView } from "./memory-timeline-view";
import { MemoryControlPanel } from "./memory-control-panel";
import { MemoryDetailPanel } from "./memory-detail-panel";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { Button } from "@multica/ui/components/ui/button";

export function MemoryPage() {
  const { t } = useT("memories");
  const wsId = useWorkspaceId();

  // Zustand store state and actions
  const {
    graphData,
    searchQuery,
    selectedTags,
    viewMode,
    nodeLimit,
    selectedNodeId,
    selectedMemoryTypes,
    setSearchQuery,
    addTag,
    removeTag,
    setViewMode,
    toggleMemoryType,
    setGraphData,
  } = useMemoryGraphStore();

  // Fetch graph data
  const { data: fetchedData, isLoading, error, refetch } = useMemoryGraph(wsId, {
    limit: nodeLimit,
    type: selectedMemoryTypes,
    q: searchQuery,
    tags: selectedTags,
  });

  // Sync fetched data with Zustand store
  useEffect(() => {
    if (fetchedData) {
      setGraphData(fetchedData);
    }
  }, [fetchedData, setGraphData]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Top Bar: Title, Filters */}
      <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">{t(($) => $.graph_title) || "Memory Graph"}</h2>
        </div>

        {/* Filters Component */}
        <MemoryFilters
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          viewMode={viewMode}
          selectedMemoryTypes={selectedMemoryTypes}
          onSearchChange={setSearchQuery}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onViewModeChange={setViewMode}
          onToggleMemoryType={toggleMemoryType}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* View Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Loading overlay - only over graph area */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">{t(($) => $.loading_graph) || "Loading graph..."}</span>
              </div>
            </div>
          )}

          {/* Error state - inline card */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-destructive">{t(($) => $.graph_error) || "Failed to load graph"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => refetch()}
                  >
                    {t(($) => $.try_again) || "Try again"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state - no memories (only shown when not loading and no error) */}
          {!isLoading && !error && (!graphData?.nodes || graphData.nodes.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="pointer-events-auto">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t(($) => $.graph_empty) || "No memories in graph"}</p>
                  {(searchQuery || selectedTags.length > 0 || selectedMemoryTypes.length > 0) && (
                    <p className="mt-2 text-xs">
                      {t(($) => $.try_adjust_filters) || "Try adjusting your search or filters"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Render view based on mode */}
          {!isLoading && !error && graphData && graphData.nodes.length > 0 && (
            <div className="w-full h-full">
              {viewMode === "graph" && (
                <CytoscapeGraph data={graphData} isLoading={isLoading} />
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
