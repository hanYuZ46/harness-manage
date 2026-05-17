import { describe, it, expect } from "vitest";
import { useMemoryGraphStore, clampNodeLimit } from "./graph-store";

describe("useMemoryGraphStore", () => {
  it("should initialize with default state", () => {
    const state = useMemoryGraphStore.getState();

    expect(state.graphData).toBeNull();
    expect(state.searchQuery).toBe("");
    expect(state.selectedTags).toEqual([]);
    expect(state.selectedLinkTypes).toEqual(["semantic", "temporal", "entity", "causal"]);
    expect(state.viewMode).toBe("graph");
    expect(state.nodeLimit).toBe(30);
    expect(state.showLabels).toBe(true);
    expect(state.selectedNodeId).toBeNull();
    expect(state.focusedNodeId).toBeNull();
  });

  it("should add tag correctly", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().addTag("tag1");

    const state = useMemoryGraphStore.getState();
    expect(state.selectedTags).toEqual(["tag1"]);
  });

  it("should not add duplicate tags", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().addTag("tag1");
    useMemoryGraphStore.getState().addTag("tag1");

    const state = useMemoryGraphStore.getState();
    expect(state.selectedTags).toEqual(["tag1"]);
  });

  it("should remove tag correctly", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().addTag("tag1");
    useMemoryGraphStore.getState().addTag("tag2");
    useMemoryGraphStore.getState().removeTag("tag1");

    const state = useMemoryGraphStore.getState();
    expect(state.selectedTags).toEqual(["tag2"]);
  });

  it("should clamp nodeLimit to 20-50 range", () => {
    useMemoryGraphStore.getState().reset();

    // Test below minimum
    useMemoryGraphStore.getState().setNodeLimit(5);
    expect(useMemoryGraphStore.getState().nodeLimit).toBe(20);

    // Test above maximum
    useMemoryGraphStore.getState().setNodeLimit(100);
    expect(useMemoryGraphStore.getState().nodeLimit).toBe(50);

    // Test within range
    useMemoryGraphStore.getState().setNodeLimit(35);
    expect(useMemoryGraphStore.getState().nodeLimit).toBe(35);
  });
});

describe("clampNodeLimit", () => {
  it("should clamp values below minimum to 20", () => {
    expect(clampNodeLimit(0)).toBe(20);
    expect(clampNodeLimit(10)).toBe(20);
    expect(clampNodeLimit(19)).toBe(20);
  });

  it("should clamp values above maximum to 50", () => {
    expect(clampNodeLimit(51)).toBe(50);
    expect(clampNodeLimit(100)).toBe(50);
    expect(clampNodeLimit(999)).toBe(50);
  });

  it("should return same value when within range", () => {
    expect(clampNodeLimit(20)).toBe(20);
    expect(clampNodeLimit(30)).toBe(30);
    expect(clampNodeLimit(50)).toBe(50);
  });
});

describe("setGraphData", () => {
  it("should set graph data", () => {
    useMemoryGraphStore.getState().reset();

    const mockData = { nodes: [], table_rows: [] };
    useMemoryGraphStore.getState().setGraphData(mockData);

    expect(useMemoryGraphStore.getState().graphData).toEqual(mockData);
  });

  it("should set graph data to null", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setGraphData(null);

    expect(useMemoryGraphStore.getState().graphData).toBeNull();
  });
});

describe("setViewMode", () => {
  it("should set view mode to graph", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setViewMode("graph");

    expect(useMemoryGraphStore.getState().viewMode).toBe("graph");
  });

  it("should set view mode to table", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setViewMode("table");

    expect(useMemoryGraphStore.getState().viewMode).toBe("table");
  });

  it("should set view mode to timeline", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setViewMode("timeline");

    expect(useMemoryGraphStore.getState().viewMode).toBe("timeline");
  });
});

describe("toggleShowLabels", () => {
  it("should toggle showLabels from true to false", () => {
    useMemoryGraphStore.getState().reset();

    expect(useMemoryGraphStore.getState().showLabels).toBe(true);
    useMemoryGraphStore.getState().toggleShowLabels();
    expect(useMemoryGraphStore.getState().showLabels).toBe(false);
  });

  it("should toggle showLabels from false to true", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().toggleShowLabels();

    expect(useMemoryGraphStore.getState().showLabels).toBe(false);
    useMemoryGraphStore.getState().toggleShowLabels();
    expect(useMemoryGraphStore.getState().showLabels).toBe(true);
  });
});

describe("setSelectedNode and setFocusedNode", () => {
  it("should set selected node id", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setSelectedNode("node-1");

    expect(useMemoryGraphStore.getState().selectedNodeId).toBe("node-1");
  });

  it("should set focused node id", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setFocusedNode("node-2");

    expect(useMemoryGraphStore.getState().focusedNodeId).toBe("node-2");
  });

  it("should set selected node id to null", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().setSelectedNode("node-1");

    useMemoryGraphStore.getState().setSelectedNode(null);

    expect(useMemoryGraphStore.getState().selectedNodeId).toBeNull();
  });

  it("should set focused node id to null", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().setFocusedNode("node-2");

    useMemoryGraphStore.getState().setFocusedNode(null);

    expect(useMemoryGraphStore.getState().focusedNodeId).toBeNull();
  });
});

describe("toggleLinkType", () => {
  it("should remove link type if already selected", () => {
    useMemoryGraphStore.getState().reset();

    expect(useMemoryGraphStore.getState().selectedLinkTypes).toContain("semantic");
    useMemoryGraphStore.getState().toggleLinkType("semantic");
    expect(useMemoryGraphStore.getState().selectedLinkTypes).not.toContain("semantic");
  });

  it("should add link type if not selected", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().toggleLinkType("custom");

    expect(useMemoryGraphStore.getState().selectedLinkTypes).toContain("custom");
  });

  it("should not remove the last link type", () => {
    useMemoryGraphStore.getState().reset();

    // Remove three link types, leaving only "causal"
    useMemoryGraphStore.getState().toggleLinkType("semantic");
    useMemoryGraphStore.getState().toggleLinkType("temporal");
    useMemoryGraphStore.getState().toggleLinkType("entity");

    // Should have only "causal" left
    expect(useMemoryGraphStore.getState().selectedLinkTypes).toEqual(["causal"]);

    // Try to remove the last one - should not work
    useMemoryGraphStore.getState().toggleLinkType("causal");

    expect(useMemoryGraphStore.getState().selectedLinkTypes).toEqual(["causal"]);
  });
});

describe("clearTags", () => {
  it("should clear all selected tags", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().addTag("tag1");
    useMemoryGraphStore.getState().addTag("tag2");

    useMemoryGraphStore.getState().clearTags();

    expect(useMemoryGraphStore.getState().selectedTags).toEqual([]);
  });
});

describe("reset", () => {
  it("should reset all state to initial values", () => {
    useMemoryGraphStore.getState().setGraphData({ nodes: [], table_rows: [] });
    useMemoryGraphStore.getState().setSearchQuery("test");
    useMemoryGraphStore.getState().addTag("tag1");
    useMemoryGraphStore.getState().setViewMode("table");
    useMemoryGraphStore.getState().setNodeLimit(40);
    useMemoryGraphStore.getState().toggleShowLabels();
    useMemoryGraphStore.getState().setSelectedNode("node-1");
    useMemoryGraphStore.getState().setFocusedNode("node-2");

    useMemoryGraphStore.getState().reset();

    const state = useMemoryGraphStore.getState();
    expect(state.graphData).toBeNull();
    expect(state.searchQuery).toBe("");
    expect(state.selectedTags).toEqual([]);
    expect(state.viewMode).toBe("graph");
    expect(state.nodeLimit).toBe(30);
    expect(state.showLabels).toBe(true);
    expect(state.selectedNodeId).toBeNull();
    expect(state.focusedNodeId).toBeNull();
  });
});

describe("selectedMemoryTypes", () => {
  it("should initialize with default selectedMemoryTypes [observation]", () => {
    useMemoryGraphStore.getState().reset();

    const state = useMemoryGraphStore.getState();
    expect(state.selectedMemoryTypes).toEqual(["observation"]);
  });

  it("should set memory types with setMemoryTypes", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().setMemoryTypes(["observation", "experience", "fact"]);

    expect(useMemoryGraphStore.getState().selectedMemoryTypes).toEqual([
      "observation",
      "experience",
      "fact",
    ]);
  });

  it("should toggle memory type with toggleMemoryType - add", () => {
    useMemoryGraphStore.getState().reset();

    useMemoryGraphStore.getState().toggleMemoryType("experience");

    expect(useMemoryGraphStore.getState().selectedMemoryTypes).toEqual([
      "observation",
      "experience",
    ]);
  });

  it("should toggle memory type with toggleMemoryType - remove", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().setMemoryTypes(["observation", "experience"]);

    useMemoryGraphStore.getState().toggleMemoryType("observation");

    expect(useMemoryGraphStore.getState().selectedMemoryTypes).toEqual(["experience"]);
  });

  it("should not remove the last memory type", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().setMemoryTypes(["observation"]);

    useMemoryGraphStore.getState().toggleMemoryType("observation");

    expect(useMemoryGraphStore.getState().selectedMemoryTypes).toEqual(["observation"]);
  });

  it("should reset selectedMemoryTypes to default on reset", () => {
    useMemoryGraphStore.getState().reset();
    useMemoryGraphStore.getState().setMemoryTypes(["fact"]);

    useMemoryGraphStore.getState().reset();

    expect(useMemoryGraphStore.getState().selectedMemoryTypes).toEqual(["observation"]);
  });
});
