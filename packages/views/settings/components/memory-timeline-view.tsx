"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@multica/ui/components/ui/badge";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useT } from "../../i18n";
import type { MemoryGraphTableRow } from "@multica/core/types/memory";

interface GroupedEvents {
  monthLabel: string;
  events: TimelineEvent[];
}

interface MemoryTimelineViewProps {
  data: MemoryGraphTableRow[];
}

interface TimelineEvent {
  id: string;
  text: string;
  timestamp: string;
  type?: string;
  tags?: string[];
  entities?: string;
}

export function MemoryTimelineView({ data }: MemoryTimelineViewProps) {
  const { t } = useT("memories");
  const { setSelectedNode, selectedNodeId, searchQuery, selectedTags } = useMemoryGraphStore();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Filter and group data by month
  const groupedEvents = useMemo(() => {
    // Filter data
    let filtered = data.filter((row) => {
      const timestamp = row.occurred_start || row.mentioned_at;
      if (!timestamp) return false;

      // Filter by search query
      if (searchQuery && !row.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by tags
      if (selectedTags.length > 0 && row.tags) {
        const hasMatchingTag = selectedTags.some((tag) => row.tags?.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sort by timestamp
    filtered.sort((a, b) => {
      const aTime = a.occurred_start || a.mentioned_at || "";
      const bTime = b.occurred_start || b.mentioned_at || "";
      return bTime.localeCompare(aTime);
    });

    // Group by month
    const groups: Record<string, GroupedEvents> = {};

    filtered.forEach((row) => {
      const timestamp = row.occurred_start || row.mentioned_at;
      if (!timestamp) return;

      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString(undefined, { year: "numeric", month: "long" });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthLabel,
          events: [],
        };
      }

      groups[monthKey].events.push({
        id: row.id,
        text: row.text,
        timestamp,
        type: row.type,
        tags: row.tags,
        entities: row.entities,
      });
    });

    return groups;
  }, [data, searchQuery, selectedTags]);

  // Toggle month expansion
  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // Get type badge variant
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

  return (
    <div className="w-full h-full overflow-auto p-4">
      {Object.keys(groupedEvents).length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Calendar className="h-12 w-12 mr-2 opacity-50" />
          <p>{t(($) => $.timeline_empty) || "No timeline events"}</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {Object.entries(groupedEvents).map(([monthKey, group]: [string, any]) => {
            const isExpanded = expandedMonths.has(monthKey);
            const events = group.events;

            return (
              <div key={monthKey} className="relative">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="flex items-center gap-2 mb-3 text-left hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="text-sm font-semibold">{group.monthLabel}</h3>
                  <Badge variant="outline" className="text-xs">
                    {events.length} events
                  </Badge>
                </button>

                {/* Events list */}
                {isExpanded && (
                  <div className="relative pl-6 border-l-2 border-border space-y-3">
                    {events.map((event: TimelineEvent) => {
                      const typeBadge = getTypeBadge(event.type);
                      const isSelected = event.id === selectedNodeId;

                      return (
                        <div
                          key={event.id}
                          className={`relative pl-4 py-2 pr-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedNode(event.id)}
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-[-5px] top-6 h-2.5 w-2.5 rounded-full border-2 border-background ${
                              isSelected ? "bg-primary" : "bg-muted-foreground/50"
                            }`}
                          />

                          {/* Date */}
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(event.timestamp).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>

                          {/* Content */}
                          <div className="text-sm mb-2">{event.text}</div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-2">
                            {typeBadge.label && (
                              <Badge variant={typeBadge.variant} className="text-xs">
                                {typeBadge.label}
                              </Badge>
                            )}
                            {event.tags && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {event.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs font-mono bg-amber-500/10 text-amber-700 border-amber-500/20"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                                {event.tags.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{event.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
