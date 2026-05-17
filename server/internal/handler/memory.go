package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/multica-ai/multica/server/internal/service"
)

// MemoryListResponse is the response for listing memories
type MemoryListResponse struct {
	Memories []service.MemoryResult `json:"memories"`
	Total    int                    `json:"total"`
}

// GetMemories retrieves memories from the workspace's memory bank
func (h *Handler) GetMemories(w http.ResponseWriter, r *http.Request) {
	// Get workspace ID from URL parameter
	wsID := chi.URLParam(r, "workspaceId")
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "workspace ID is required")
		return
	}

	bankID := fmt.Sprintf("ws-%s", wsID)

	// Parse query parameters
	agentID := r.URL.Query().Get("agent_id")
	query := strings.TrimSpace(r.URL.Query().Get("query"))

	if h.MemoryClient == nil {
		writeError(w, http.StatusServiceUnavailable, "memory service not configured")
		return
	}

	// If query is empty and no agent_id, return empty results
	// (enn-memory API requires a non-empty query)
	if query == "" && agentID == "" {
		writeJSON(w, http.StatusOK, MemoryListResponse{
			Memories: []service.MemoryResult{},
			Total:    0,
		})
		return
	}

	// Build recall request - only include non-empty fields to avoid API errors
	recallReq := service.RecallRequest{
		Query: query,
		Limit: 100,
	}

	// Only add tags if query param is provided
	tagValues := r.URL.Query()["tags"]
	if len(tagValues) > 0 {
		recallReq.Tags = tagValues
	}

	// If agent_id is provided, add to tags
	if agentID != "" {
		recallReq.Tags = append(recallReq.Tags, fmt.Sprintf("agent:%s", agentID))
	}

	// Query memories
	memories, err := h.MemoryClient.Recall(r.Context(), bankID, recallReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, MemoryListResponse{
		Memories: memories,
		Total:    len(memories),
	})
}

// MemoryGraphResponse is the response for the memory graph
type MemoryGraphResponse struct {
	Nodes      []MemoryGraphNode     `json:"nodes"`
	Edges      []MemoryGraphEdge     `json:"edges,omitempty"`
	TableRows  []MemoryGraphTableRow `json:"table_rows,omitempty"`
	TotalUnits int                   `json:"total_units,omitempty"`
}

// MemoryGraphNode represents a node in the memory graph
type MemoryGraphNode struct {
	Data MemoryGraphNodeData `json:"data"`
}

// MemoryGraphNodeData represents node data
type MemoryGraphNodeData struct {
	ID    string  `json:"id"`
	Label *string `json:"label,omitempty"`
	Color *string `json:"color,omitempty"`
}

// MemoryGraphEdge represents an edge in the memory graph
type MemoryGraphEdge struct {
	Data MemoryGraphEdgeData `json:"data"`
}

// MemoryGraphEdgeData represents edge data
type MemoryGraphEdgeData struct {
	Source     string   `json:"source"`
	Target     string   `json:"target"`
	Color      *string  `json:"color,omitempty"`
	LineStyle  *string  `json:"lineStyle,omitempty"`
	LinkType   *string  `json:"linkType,omitempty"`
	EntityName *string  `json:"entityName,omitempty"`
	Weight     *float64 `json:"weight,omitempty"`
	Similarity *float64 `json:"similarity,omitempty"`
}

// MemoryGraphTableRow represents a table row in the memory graph response
type MemoryGraphTableRow struct {
	ID            string   `json:"id"`
	Text          string   `json:"text"`
	Entities      *string  `json:"entities,omitempty"`
	Context       *string  `json:"context,omitempty"`
	Tags          []string `json:"tags,omitempty"`
	OccurredStart *string  `json:"occurred_start,omitempty"`
	OccurredEnd   *string  `json:"occurred_end,omitempty"`
	MentionedAt   *string  `json:"mentioned_at,omitempty"`
	Date          *string  `json:"date,omitempty"`
	DocumentID    *string  `json:"document_id,omitempty"`
	ChunkID       *string  `json:"chunk_id,omitempty"`
	FactType      *string  `json:"fact_type,omitempty"`
	ProofCount    *int     `json:"proof_count,omitempty"`
}

// GetMemoryGraph proxies the memory graph request to enn-memory-clients service
// GET /api/workspaces/{workspaceId}/memories/graph
func (h *Handler) GetMemoryGraph(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get workspace ID from URL
	workspaceID := chi.URLParam(r, "workspaceId")
	if workspaceID == "" {
		http.Error(w, "workspaceId is required", http.StatusBadRequest)
		return
	}

	// Build bank_id as ws-{workspaceId}
	bankID := fmt.Sprintf("ws-%s", workspaceID)

	// Get query parameters
	queryParams := r.URL.Query()
	graphType := queryParams.Get("type")
	limit := queryParams.Get("limit")

	// Build upstream URL
	memoryServiceURL := "https://enn-memory-clients.dev.ennew.com/api/graph"
	upstreamURL, err := url.Parse(memoryServiceURL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to parse memory service URL", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Add query parameters
	q := upstreamURL.Query()
	q.Set("bank_id", bankID)
	if graphType != "" {
		q.Set("type", graphType)
	}
	if limit != "" {
		q.Set("limit", limit)
	}
	upstreamURL.RawQuery = q.Encode()

	// Create upstream request
	upstreamReq, err := http.NewRequestWithContext(ctx, "GET", upstreamURL.String(), nil)
	if err != nil {
		slog.ErrorContext(ctx, "failed to create upstream request", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Set headers
	upstreamReq.Header.Set("Accept", "*/*")
	upstreamReq.Header.Set("Content-Type", "application/json")

	// Execute upstream request
	client := &http.Client{}
	resp, err := client.Do(upstreamReq)
	if err != nil {
		slog.ErrorContext(ctx, "failed to fetch from memory service", "error", err, "url", upstreamURL.String())
		http.Error(w, "failed to fetch from memory service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		slog.ErrorContext(ctx, "failed to copy response body", "error", err)
	}
}

// GetMemoryDetail proxies the memory detail request to enn-memory-clients service
// GET /api/workspaces/{workspaceId}/memories/{memoryId}
func (h *Handler) GetMemoryDetail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get workspace ID and memory ID from URL
	workspaceID := chi.URLParam(r, "workspaceId")
	memoryID := chi.URLParam(r, "memoryId")

	if workspaceID == "" {
		http.Error(w, "workspaceId is required", http.StatusBadRequest)
		return
	}
	if memoryID == "" {
		http.Error(w, "memoryId is required", http.StatusBadRequest)
		return
	}

	// Build bank_id as ws-{workspaceId}
	bankID := fmt.Sprintf("ws-%s", workspaceID)

	// Build upstream URL
	memoryServiceURL := "https://enn-memory-clients.dev.ennew.com/api/memory"
	upstreamURL, err := url.Parse(memoryServiceURL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to parse memory service URL", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Add query parameters
	q := upstreamURL.Query()
	q.Set("bank_id", bankID)
	q.Set("memory_id", memoryID)
	upstreamURL.RawQuery = q.Encode()

	// Create upstream request
	upstreamReq, err := http.NewRequestWithContext(ctx, "GET", upstreamURL.String(), nil)
	if err != nil {
		slog.ErrorContext(ctx, "failed to create upstream request", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Set headers
	upstreamReq.Header.Set("Accept", "*/*")
	upstreamReq.Header.Set("Content-Type", "application/json")

	// Execute upstream request
	client := &http.Client{}
	resp, err := client.Do(upstreamReq)
	if err != nil {
		slog.ErrorContext(ctx, "failed to fetch from memory service", "error", err, "url", upstreamURL.String())
		http.Error(w, "failed to fetch from memory service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy status code
	w.WriteHeader(resp.StatusCode)

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.ErrorContext(ctx, "failed to read response body", "error", err)
		http.Error(w, "failed to read response", http.StatusBadGateway)
		return
	}

	// Parse and re-marshal to ensure correct format
	var detailResp map[string]interface{}
	if err := json.Unmarshal(body, &detailResp); err != nil {
		slog.ErrorContext(ctx, "failed to parse memory detail response", "error", err)
		http.Error(w, "failed to parse response", http.StatusBadGateway)
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(detailResp); err != nil {
		slog.ErrorContext(ctx, "failed to encode response", "error", err)
	}
}
