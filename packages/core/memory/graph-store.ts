import { create } from "zustand";
import type { MemoryGraphResponse } from "../types/memory";

export type MemoryGraphViewMode = "graph" | "table" | "timeline";

export interface MemoryGraphState {
  // Data
  graphData: MemoryGraphResponse | null;

  // Search & Filter
  searchQuery: string;
  selectedTags: string[];
  selectedLinkTypes: string[];

  // View
  viewMode: MemoryGraphViewMode;
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
  setViewMode: (mode: MemoryGraphViewMode) => void;
  setNodeLimit: (limit: number) => void;
  toggleShowLabels: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setFocusedNode: (nodeId: string | null) => void;
  toggleLinkType: (linkType: string) => void;
  reset: () => void;
}

const DEFAULT_NODE_LIMIT = 30;
const MIN_NODE_LIMIT = 20;
const MAX_NODE_LIMIT = 50;
const DEFAULT_LINK_TYPES = ["semantic", "temporal", "entity", "causal"];

const initialState = {
  graphData: null,
  searchQuery: "",
  selectedTags: [],
  selectedLinkTypes: DEFAULT_LINK_TYPES,
  viewMode: "graph" as MemoryGraphViewMode,
  nodeLimit: DEFAULT_NODE_LIMIT,
  showLabels: true,
  selectedNodeId: null,
  focusedNodeId: null,
};

export function clampNodeLimit(limit: number): number {
  return Math.min(Math.max(limit, MIN_NODE_LIMIT), MAX_NODE_LIMIT);
}

export const useMemoryGraphStore = create<MemoryGraphState>((set, get) => ({
  ...initialState,

  setGraphData: (data) => {
    set({ graphData: data });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  addTag: (tag) => {
    const { selectedTags } = get();
    if (!selectedTags.includes(tag)) {
      set({ selectedTags: [...selectedTags, tag] });
    }
  },

  removeTag: (tag) => {
    const { selectedTags } = get();
    set({ selectedTags: selectedTags.filter((t) => t !== tag) });
  },

  clearTags: () => {
    set({ selectedTags: [] });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setNodeLimit: (limit) => {
    set({ nodeLimit: clampNodeLimit(limit) });
  },

  toggleShowLabels: () => {
    const { showLabels } = get();
    set({ showLabels: !showLabels });
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  setFocusedNode: (nodeId) => {
    set({ focusedNodeId: nodeId });
  },

  toggleLinkType: (linkType) => {
    const { selectedLinkTypes } = get();
    if (selectedLinkTypes.includes(linkType)) {
      // Don't allow removing the last link type
      if (selectedLinkTypes.length > 1) {
        set({
          selectedLinkTypes: selectedLinkTypes.filter((t) => t !== linkType),
        });
      }
    } else {
      set({ selectedLinkTypes: [...selectedLinkTypes, linkType] });
    }
  },

  reset: () => {
    set({ ...initialState });
  },
}));
