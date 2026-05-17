"use client";

import { useMemo } from "react";
import { Brain, Link, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Slider } from "@multica/ui/components/ui/slider";
import { Switch } from "@multica/ui/components/ui/switch";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useT } from "../../i18n";

const LINK_TYPE_COLORS: Record<string, string> = {
  semantic: "#0074d9",
  temporal: "#009296",
  entity: "#f59e0b",
  causal: "#8b5cf6",
};

const LINK_TYPE_LABELS: Record<string, string> = {
  semantic: "Semantic",
  temporal: "Temporal",
  entity: "Entity",
  causal: "Causal",
};

export function MemoryControlPanel() {
  const { t } = useT("memories");
  const {
    graphData,
    nodeLimit,
    showLabels,
    selectedLinkTypes,
    setNodeLimit,
    toggleShowLabels,
    toggleLinkType,
  } = useMemoryGraphStore();

  // Count edges by type
  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      semantic: 0,
      temporal: 0,
      entity: 0,
      causal: 0,
    };

    graphData?.edges?.forEach((edge) => {
      const type = edge.data.linkType || (edge.data.lineStyle === "dashed" ? "temporal" : "semantic");
      if (counts[type] !== undefined) {
        counts[type]++;
      }
    });

    return counts;
  }, [graphData]);

  const totalNodes = graphData?.nodes.length ?? 0;
  const totalEdges = graphData?.edges?.length ?? 0;

  return (
    <div className="w-72 border-l border-border overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Stats */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4" />
              {t(($) => $.stats_title) || "Graph Statistics"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">
                {t(($) => $.nodes) || "Nodes"}
              </div>
              <div className="text-right font-medium">{totalNodes}</div>
              <div className="text-muted-foreground">
                {t(($) => $.edges) || "Edges"}
              </div>
              <div className="text-right font-medium">{totalEdges}</div>
            </div>
            <div className="border-t pt-2 space-y-1">
              {Object.entries(edgeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: LINK_TYPE_COLORS[type] }}
                    />
                    <span className="text-muted-foreground">
                      {LINK_TYPE_LABELS[type]}
                    </span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Link Types */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link className="h-4 w-4" />
              {t(($) => $.link_types) || "Link Types"}
            </div>
            <div className="space-y-2">
              {Object.entries(LINK_TYPE_COLORS).map(([type, color]) => {
                const isSelected = selectedLinkTypes.includes(type);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between"
                  >
                    <button
                      onClick={() => toggleLinkType(type)}
                      className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
                    >
                      <div
                        className="w-3 h-3 rounded border-2"
                        style={{
                          backgroundColor: isSelected ? color : "transparent",
                          borderColor: color,
                        }}
                      />
                      <span className={isSelected ? "font-medium" : "text-muted-foreground"}>
                        {LINK_TYPE_LABELS[type]}
                      </span>
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {edgeCounts[type]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Display Controls */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              {t(($) => $.display) || "Display"}
            </div>

            {/* Node Limit Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t(($) => $.node_limit) || "Node Limit"}
                </span>
                <span className="font-medium">{nodeLimit}</span>
              </div>
              <Slider
                value={[nodeLimit]}
                min={20}
                max={50}
                step={5}
                onValueChange={(values) => {
                  const newValue = Array.isArray(values) ? values[0] : values;
                  setNodeLimit(newValue);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>20</span>
                <span>50</span>
              </div>
            </div>

            {/* Show Labels Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {showLabels ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span className="text-muted-foreground">
                  {t(($) => $.show_labels) || "Show Labels"}
                </span>
              </div>
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
