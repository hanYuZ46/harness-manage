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

// Graph API types - matches enn-memory-clients API response
export interface MemoryGraphNodeData {
  id: string;
  label?: string;
  color?: string;
}

export interface MemoryGraphNode {
  data: MemoryGraphNodeData;
}

export interface MemoryGraphEdgeData {
  source: string;
  target: string;
  color?: string;
  lineStyle?: string;
  linkType?: string;
  entityName?: string;
  weight?: number;
  similarity?: number;
}

export interface MemoryGraphEdge {
  data: MemoryGraphEdgeData;
}

export interface MemoryGraphTableRow {
  id: string;
  text: string;
  entities?: string;
  context?: string;
  tags?: string[];
  occurred_start?: string;
  mentioned_at?: string;
  type?: string;
}

export interface MemoryGraphResponse {
  nodes: MemoryGraphNode[];
  edges?: MemoryGraphEdge[];
  table_rows?: MemoryGraphTableRow[];
  total_units?: number;
}

export interface MemoryGraphRequest {
  type?: "world" | "experience" | "opinion";
  limit?: number;
  q?: string;
  tags?: string[];
  tags_match?: "any" | "all";
}

export interface MemoryDetailResponse {
  id: string;
  text: string;
  type: "observation" | "experience";
  context?: string;
  metadata?: Record<string, string>;
  tags?: string[];
  timestamp?: string;
  entities?: string[];
  sources?: Array<{
    fact_id: string;
    bank_id: string;
    timestamp: string;
  }>;
}
