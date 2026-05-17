import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const memoryKeys = {
  all: () => ["memories"] as const,
  workspace: (workspaceId: string) => [...memoryKeys.all(), workspaceId] as const,
  workspaceQuery: (workspaceId: string, query: string) =>
    [...memoryKeys.workspace(workspaceId), query] as const,
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
