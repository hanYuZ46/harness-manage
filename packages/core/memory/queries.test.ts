import { describe, it, expect } from "vitest";
import { memoryKeys, memoryGraphOptions } from "./queries";

describe("memoryKeys", () => {
  describe("graph", () => {
    it("should create base graph key without q and tags", () => {
      const key = memoryKeys.graph("workspace-1");
      expect(key).toEqual(["memories", "graph", "workspace-1", "", ""]);
    });

    it("should include q parameter in key", () => {
      const key = memoryKeys.graph("workspace-1", "test query");
      expect(key).toEqual(["memories", "graph", "workspace-1", "test query", ""]);
    });

    it("should include tags parameter in key", () => {
      const key = memoryKeys.graph("workspace-1", undefined, ["tag1", "tag2"]);
      expect(key).toEqual(["memories", "graph", "workspace-1", "", "tag1,tag2"]);
    });

    it("should include both q and tags parameters in key", () => {
      const key = memoryKeys.graph("workspace-1", "search", ["tag1", "tag2"]);
      expect(key).toEqual(["memories", "graph", "workspace-1", "search", "tag1,tag2"]);
    });

    it("should handle empty tags array", () => {
      const key = memoryKeys.graph("workspace-1", "search", []);
      expect(key).toEqual(["memories", "graph", "workspace-1", "search", ""]);
    });
  });
});

describe("memoryGraphOptions", () => {
  it("should create query options with base key when no params", () => {
    const options = memoryGraphOptions("workspace-1");
    expect(options.queryKey).toEqual(["memories", "graph", "workspace-1", "", ""]);
  });

  it("should include q in queryKey", () => {
    const options = memoryGraphOptions("workspace-1", { q: "test" });
    expect(options.queryKey).toEqual(["memories", "graph", "workspace-1", "test", ""]);
  });

  it("should include tags in queryKey", () => {
    const options = memoryGraphOptions("workspace-1", { tags: ["tag1", "tag2"] });
    expect(options.queryKey).toEqual(["memories", "graph", "workspace-1", "", "tag1,tag2"]);
  });

  it("should include all params in queryKey", () => {
    const options = memoryGraphOptions("workspace-1", {
      q: "search",
      tags: ["tag1"],
      type: ["experience"],
      limit: 50,
      tags_match: "all",
    });
    expect(options.queryKey).toEqual(["memories", "graph", "workspace-1", "search", "tag1"]);
    expect(options.queryFn).toBeDefined();
  });
});
