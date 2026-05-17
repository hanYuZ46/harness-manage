package handler

import (
	"fmt"
	"net/http"
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
