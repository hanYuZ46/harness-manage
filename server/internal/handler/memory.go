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
)

// MemoryListResponse is the response for listing memories
type MemoryListResponse struct {
	Memories []MemoryResult `json:"memories"`
	Total    int            `json:"total"`
}

// MemoryResult represents a memory result from the recall API
type MemoryResult struct {
	ID      string   `json:"id"`
	Text    string   `json:"text"`
	Score   float64  `json:"score"`
	Tags    []string `json:"tags"`
	Metadata struct {
		OccurredAt *string `json:"occurred_at,omitempty"`
		DocumentID *string `json:"document_id,omitempty"`
		ChunkID    *string `json:"chunk_id,omitempty"`
	} `json:"metadata,omitempty"`
}

// GetMemories retrieves memories from the workspace's memory bank
// GET /api/workspaces/{workspaceId}/memories
func (h *Handler) GetMemories(w http.ResponseWriter, r *http.Request) {
	// Get workspace ID from URL parameter
	wsID := chi.URLParam(r, "workspaceId")
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "workspace ID is required")
		return
	}

	// Parse query parameters
	agentID := r.URL.Query().Get("agent_id")
	query := strings.TrimSpace(r.URL.Query().Get("query"))

	// If query is empty and no agent_id, return empty results
	if query == "" && agentID == "" {
		writeJSON(w, http.StatusOK, MemoryListResponse{
			Memories: []MemoryResult{},
			Total:    0,
		})
		return
	}

	// Build bank_id as ws-{workspaceId}
	bankID := fmt.Sprintf("ws-%s", wsID)

	// Build upstream URL
	memoryServiceURL := "https://enn-memory.dev.ennew.com/v1/default/banks/" + url.PathEscape(bankID) + "/recall"
	upstreamURL, err := url.Parse(memoryServiceURL)
	if err != nil {
		slog.ErrorContext(r.Context(), "failed to parse memory service URL", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Add query parameters
	q := upstreamURL.Query()
	if query != "" {
		q.Set("query", query)
	}
	if agentID != "" {
		q.Set("agent_id", agentID)
	}
	tagValues := r.URL.Query()["tags"]
	for _, tag := range tagValues {
		q.Add("tags", tag)
	}
	upstreamURL.RawQuery = q.Encode()

	// Create upstream request
	upstreamReq, err := http.NewRequestWithContext(r.Context(), "GET", upstreamURL.String(), nil)
	if err != nil {
		slog.ErrorContext(r.Context(), "failed to create upstream request", "error", err)
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
		slog.ErrorContext(r.Context(), "failed to fetch from memory service", "error", err, "url", upstreamURL.String())
		http.Error(w, "failed to fetch from memory service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		slog.ErrorContext(r.Context(), "failed to copy response body", "error", err)
	}
}

// GetMemoryGraph proxies the memory graph request to enn-memory service
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
	q := queryParams.Get("q")
	tags := queryParams["tags"]

	// Log received parameters for debugging
	slog.InfoContext(ctx, "received memory graph request",
		"graphType", graphType,
		"limit", limit,
		"q", q,
		"tags", tags,
		"all_query_params", queryParams.Encode())

	// Build upstream URL - use v1 API path
	memoryServiceURL := "https://enn-memory.dev.ennew.com/v1/default/banks/" + url.PathEscape(bankID) + "/graph"
	upstreamURL, err := url.Parse(memoryServiceURL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to parse memory service URL", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Add query parameters
	qParams := upstreamURL.Query()
	if graphType != "" {
		qParams.Set("type", graphType)
	}
	if limit != "" {
		qParams.Set("limit", limit)
	}
	if q != "" {
		qParams.Set("q", q)
	}
	for _, tag := range tags {
		qParams.Add("tags", tag)
	}
	upstreamURL.RawQuery = qParams.Encode()

	// Log the full upstream URL for debugging
	slog.InfoContext(ctx, "proxying memory graph request", "upstream_url", upstreamURL.String(), "query_params", qParams.Encode())

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

// GetMemoryDetail proxies the memory detail request to enn-memory service
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

	// Build upstream URL - use v1 API path
	memoryServiceURL := "https://enn-memory.dev.ennew.com/v1/default/banks/" + url.PathEscape(bankID) + "/memories/" + url.PathEscape(memoryID)
	upstreamURL, err := url.Parse(memoryServiceURL)
	if err != nil {
		slog.ErrorContext(ctx, "failed to parse memory service URL", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

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
