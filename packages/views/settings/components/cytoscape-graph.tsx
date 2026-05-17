"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { Loader2 } from "lucide-react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import type { MemoryGraphResponse, MemoryGraphTableRow } from "@multica/core/types/memory";

// Register the fcose extension
cytoscape.use(fcose);

// Node colors by link type
const NODE_COLORS = {
  semantic: "#0074d9",    // blue - primary
  temporal: "#009296",    // teal - time relations
  entity: "#f59e0b",      // amber - entity relations
  causal: "#8b5cf6",      // purple - causal relations
};

// Edge styles by link type
const EDGE_STYLES = {
  semantic: { color: "#0074d9", lineStyle: "solid" },
  temporal: { color: "#009296", lineStyle: "dashed" },
  entity: { color: "#f59e0b", lineStyle: "solid" },
  causal: { color: "#8b5cf6", lineStyle: "dotted" },
};

interface CytoscapeGraphProps {
  data: MemoryGraphResponse | null;
  height?: number;
}

export function CytoscapeGraph({ data, height = 600 }: CytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Zustand store state
  const {
    selectedLinkTypes,
    nodeLimit,
    showLabels,
    selectedNodeId,
    focusedNodeId,
    setSelectedNode,
    setFocusedNode,
  } = useMemoryGraphStore();

  // Convert enn-memory data to Cytoscape format with filtering
  const cyElements = useMemo(() => {
    if (!data) return [];

    // Filter nodes by limit
    const nodes = (data.nodes || []).slice(0, nodeLimit).map((n) => ({
      data: {
        id: n.data.id,
        label: n.data.label || n.data.id.substring(0, 8),
        color: n.data.color || "#0074d9",
        linkType: n.data.color ?
          Object.keys(NODE_COLORS).find((key) => NODE_COLORS[key as keyof typeof NODE_COLORS] === n.data.color) || "semantic"
          : "semantic",
        row: data.table_rows?.find((r) => r.id === n.data.id),
      },
    }));

    // Filter edges by selected link types
    const edges = (data.edges || [])
      .filter((e) => {
        const edgeType = e.data.linkType || (e.data.lineStyle === "dashed" ? "temporal" : "semantic");
        return selectedLinkTypes.includes(edgeType);
      })
      .map((e, idx) => ({
        data: {
          id: `edge-${idx}`,
          source: e.data.source,
          target: e.data.target,
          type: e.data.linkType || (e.data.lineStyle === "dashed" ? "temporal" : "semantic"),
          color: e.data.color || "#0074d9",
          lineStyle: e.data.lineStyle || "solid",
        },
      }));

    return [...nodes, ...edges];
  }, [data, nodeLimit, selectedLinkTypes]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    const row = node.data("row");
    if (row) {
      setSelectedNode(node.data("id"));
    }
  }, [setSelectedNode]);

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setFocusedNode(null);
  }, [setSelectedNode, setFocusedNode]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || cyElements.length === 0) return;

    setIsLoading(true);

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      layout: {
        name: "fcose",
        animate: "end",
        animationDuration: 1000,
        fit: true,
        padding: 50,
        nodeDimensionsIncludeLabels: true,
        quality: "default",
      } as any,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => ele.data("color") || "#0074d9",
            label: (ele: any) => showLabels ? (ele.data("label") || "") : "",
            "text-valign": "bottom",
            "text-halign": "center",
            "font-size": "11px",
            "font-family": "Inter, sans-serif",
            "text-wrap": "wrap",
            "text-max-width": "100px",
            width: 20,
            height: 20,
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": (ele: any) => {
              const type = ele.data("type");
              return EDGE_STYLES[type as keyof typeof EDGE_STYLES]?.color || "#0074d9";
            },
            "target-arrow-color": (ele: any) => ele.data("line-color") || "#0074d9",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            width: 1.5,
            opacity: 0.6,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#0074d9",
            "background-opacity": 0.8,
          },
        },
        {
          selector: "node:focus",
          style: {
            "border-width": 3,
            "border-color": "#8b5cf6",
            "background-opacity": 0.9,
          },
        },
        {
          selector: "node:hover",
          style: {
            "background-opacity": 0.8,
          },
        },
      ],
      boxSelectionEnabled: false,
      zoomingEnabled: true,
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.3,
    });

    // Handle node click
    cy.on("tap", "node", (evt: any) => {
      const node = evt.target;
      handleNodeClick(node);
    });

    // Handle background click to deselect
    cy.on("tap", (evt: any) => {
      if (evt.target === cy) {
        handleBackgroundClick();
      }
    });

    // Handle double-click for focus
    cy.on("dblclick", "node", (evt: any) => {
      const node = evt.target;
      setFocusedNode(node.data("id"));

      // Highlight connected nodes
      const neighborhood = node.neighborhood();
      cy.elements().removeClass("faded");
      neighborhood.addClass("highlighted");
      node.addClass("highlighted");
    });

    cyRef.current = cy;

    cy.on("layoutstop", () => {
      setIsLoading(false);
    });

    return () => {
      if (cy) {
        (cy as any).destroy();
      }
    };
  }, [cyElements, showLabels, handleNodeClick, handleBackgroundClick, setFocusedNode]);

  // Update layout when data changes
  useEffect(() => {
    if (cyRef.current && cyElements.length > 0) {
      cyRef.current.elements(cyElements);
      const layout = (cyRef.current as any).layout({
        name: "fcose",
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
      });
      layout.run();
    }
  }, [cyElements]);

  // Update selected node styling
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass("selected");
      if (selectedNodeId) {
        const node = cyRef.current.getElementById(selectedNodeId);
        if (node.length > 0) {
          node.addClass("selected");
        }
      }
    }
  }, [selectedNodeId]);

  // Update focused node styling
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass("focus");
      if (focusedNodeId) {
        const node = cyRef.current.getElementById(focusedNodeId);
        if (node.length > 0) {
          node.addClass("focus");
        }
      }
    }
  }, [focusedNodeId]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading graph...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" style={{ height }} />
    </div>
  );
}
