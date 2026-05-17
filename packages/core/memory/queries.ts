import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const memoryKeys = {
  all: () => ["memories"] as const,
  workspace: (workspaceId: string) => [...memoryKeys.all(), workspaceId] as const,
  workspaceQuery: (workspaceId: string, query: string) =>
    [...memoryKeys.workspace(workspaceId), query] as const,
  graph: (workspaceId: string, q?: string, tags?: string[]) =>
    [...memoryKeys.all(), "graph", workspaceId, q ?? "", tags?.join(",") ?? ""] as const,
  detail: (bankId: string, memoryId: string) => [...memoryKeys.all(), "detail", bankId, memoryId] as const,
};

export function memoryListOptions(
  workspaceId: string,
  params?: { query?: string; agent_id?: string },
) {
  return queryOptions({
    queryKey: params?.query
      ? memoryKeys.workspaceQuery(workspaceId, params.query)
      : memoryKeys.workspace(workspaceId),
    queryFn: () => api.listMemories(workspaceId, params),
  });
}

export function memoryGraphOptions(
  workspaceId: string,
  params?: { type?: string[]; limit?: number; q?: string; tags?: string[]; tags_match?: "any" | "all" },
) {
  return queryOptions({
    queryKey: memoryKeys.graph(workspaceId, params?.q, params?.tags),
    queryFn: () => api.getMemoryGraph(workspaceId, params),
  });
}

export function memoryDetailOptions(workspaceId: string, memoryId: string) {
  return queryOptions({
    queryKey: memoryKeys.detail(workspaceId, memoryId),
    queryFn: () => api.getMemoryDetail(workspaceId, memoryId),
  });
}
