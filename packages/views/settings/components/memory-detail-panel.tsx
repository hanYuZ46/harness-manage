"use client";

import { Calendar, User, Tag, Brain } from "lucide-react";
import { Badge } from "@multica/ui/components/ui/badge";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useT } from "../../i18n";
import type { MemoryGraphTableRow } from "@multica/core/types/memory";

interface MemoryDetailPanelProps {
  data: MemoryGraphTableRow[];
}

export function MemoryDetailPanel({ data }: MemoryDetailPanelProps) {
  const { t } = useT("memories");
  const { selectedNodeId, setSelectedNode } = useMemoryGraphStore();

  const selectedMemory = data.find((row) => row.id === selectedNodeId);

  if (!selectedMemory) return null;

  const getTypeBadge = (type?: string) => {
    const variants: Record<string, string> = {
      experience: "default",
      world: "secondary",
      opinion: "outline",
    };
    const labels: Record<string, string> = {
      experience: t(($) => $.type_experience) || "Experience",
      world: t(($) => $.type_world) || "World",
      opinion: t(($) => $.type_opinion) || "Opinion",
    };
    return { variant: variants[type || ""] as any, label: labels[type || ""] || type };
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-80 border-l border-border overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {t(($) => $.detail_title) || "Memory Details"}
          </h3>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Brain className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm leading-relaxed">{selectedMemory.text}</p>
        </div>

        {/* Type Badge */}
        {selectedMemory.type && (
          <div>
            <Badge variant={getTypeBadge(selectedMemory.type).variant}>
              {getTypeBadge(selectedMemory.type).label}
            </Badge>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-3 text-xs">
          {/* Timestamp */}
          {(selectedMemory.occurred_start || selectedMemory.mentioned_at) && (
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                {selectedMemory.occurred_start && (
                  <div>
                    <span className="text-muted-foreground">Occurred: </span>
                    {formatDate(selectedMemory.occurred_start)}
                  </div>
                )}
                {selectedMemory.mentioned_at && (
                  <div>
                    <span className="text-muted-foreground">Mentioned: </span>
                    {formatDate(selectedMemory.mentioned_at)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entities */}
          {selectedMemory.entities && (
            <div className="flex items-start gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Entities: </span>
                {selectedMemory.entities}
              </div>
            </div>
          )}

          {/* Tags */}
          {selectedMemory.tags && selectedMemory.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {selectedMemory.tags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs font-mono bg-amber-500/10 text-amber-700 border-amber-500/20"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
