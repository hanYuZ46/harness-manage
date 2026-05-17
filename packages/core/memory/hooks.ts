import { useQuery } from "@tanstack/react-query";
import { memoryListOptions } from "./queries";

export function useMemories(
  workspaceId: string,
  params?: { query?: string; agent_id?: string },
) {
  return useQuery(memoryListOptions(workspaceId, params));
}
