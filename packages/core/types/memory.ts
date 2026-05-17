export interface MemoryItem {
  id: string;
  content: string;
  context?: string;
  metadata?: Record<string, string>;
  tags?: string[];
  timestamp?: string;
  score?: number;
  type?: "observation" | "experience";
  entities?: string[];
}

export interface MemoryListResponse {
  memories: MemoryItem[];
  total: number;
}

export interface MemoryRecallRequest {
  query: string;
  tags?: string[];
  limit?: number;
}
