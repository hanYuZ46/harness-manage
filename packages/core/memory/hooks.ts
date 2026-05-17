import { useQuery } from "@tanstack/react-query";
import { memoryListOptions, memoryGraphOptions, memoryDetailOptions } from "./queries";

export function useMemories(
  workspaceId: string,
  params?: { query?: string; agent_id?: string },
) {
  return useQuery(memoryListOptions(workspaceId, params));
}

export function useMemoryGraph(
  workspaceId: string,
  params?: { type?: "world" | "experience" | "opinion"; limit?: number; q?: string; tags?: string[]; tags_match?: "any" | "all" },
) {
  return useQuery(memoryGraphOptions(workspaceId, params));
}

export function useMemoryDetail(workspaceId: string, memoryId: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...memoryDetailOptions(workspaceId, memoryId),
    enabled: options?.enabled ?? (!!workspaceId && !!memoryId),
  });
}
