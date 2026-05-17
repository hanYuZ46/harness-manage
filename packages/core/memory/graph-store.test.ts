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
