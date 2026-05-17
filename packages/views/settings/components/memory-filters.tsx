"use client";

import { useState, useCallback, useEffect, type KeyboardEvent } from "react";
import { Search, Plus, X } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { useT } from "../../i18n";
import type { MemoryGraphViewMode } from "@multica/core/memory/graph-store";

export interface MemoryFiltersProps {
  searchQuery: string;
  selectedTags: string[];
  viewMode: MemoryGraphViewMode;
  selectedMemoryTypes: string[];
  onSearchChange: (query: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onViewModeChange: (mode: MemoryGraphViewMode) => void;
  onToggleMemoryType: (type: string) => void;
}

export function MemoryFilters({
  searchQuery,
  selectedTags,
  viewMode,
  selectedMemoryTypes,
  onSearchChange,
  onAddTag,
  onRemoveTag,
  onViewModeChange,
  onToggleMemoryType,
}: MemoryFiltersProps) {
  const { t } = useT("memories");
  const [tagInput, setTagInput] = useState("");
  const [searchDebounce, setSearchDebounce] = useState(searchQuery);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchDebounce);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce, onSearchChange]);

  // Sync searchQuery prop to local state
  useEffect(() => {
    setSearchDebounce(searchQuery);
  }, [searchQuery]);

  // Handle tag input
  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && tagInput.trim()) {
        onAddTag(tagInput.trim());
        setTagInput("");
      } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
        onRemoveTag(selectedTags[selectedTags.length - 1]!);
      }
    },
    [tagInput, selectedTags, onAddTag, onRemoveTag]
  );

  return (
    <div className="space-y-3">
      {/* Memory Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">
          {t(($) => $.memory_types) || "Memory Types"}:
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={selectedMemoryTypes.includes("observation") ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleMemoryType("observation")}
          >
            {t(($) => $.type_observation) || "Observation"}
          </Button>
          <Button
            variant={selectedMemoryTypes.includes("experience") ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleMemoryType("experience")}
          >
            {t(($) => $.type_experience) || "Experience"}
          </Button>
          <Button
            variant={selectedMemoryTypes.includes("fact") ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleMemoryType("fact")}
          >
            {t(($) => $.type_fact) || "Fact"}
          </Button>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <Button
            variant={viewMode === "graph" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("graph")}
          >
            {t(($) => $.view_graph) || "Graph"}
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("table")}
          >
            {t(($) => $.view_table) || "Table"}
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("timeline")}
          >
            {t(($) => $.view_timeline) || "Timeline"}
          </Button>
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
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
            >
              #{tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:text-destructive transition-colors"
                type="button"
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
                  onAddTag(tagInput.trim());
                  setTagInput("");
                }
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
