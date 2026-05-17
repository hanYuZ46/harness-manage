"use client";

import { useEffect } from "react";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { MemoryGraphPage } from "../../settings/components/memory-graph-page";

interface CognitiveMemoryTabProps {
  agentId: string;
}

export function CognitiveMemoryTab({ agentId }: CognitiveMemoryTabProps) {
  const { setSelectedTags, clearSelectedTags } = useMemoryGraphStore();

  // Initialize with agent tag on mount
  useEffect(() => {
    const agentTag = `agent:${agentId}`;
    setSelectedTags([agentTag]);

    return () => {
      // Clear tags on unmount to avoid affecting other views
      clearSelectedTags();
    };
  }, [agentId, setSelectedTags, clearSelectedTags]);

  return <MemoryGraphPage />;
}
