package handler

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/multica-ai/multica/server/internal/service"
)

// MemoryListResponse is the response for listing memories
type MemoryListResponse struct {
	Memories []service.MemoryItem `json:"memories"`
	Total    int                  `json:"total"`
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
	tags := r.URL.Query()["tags"]
	query := r.URL.Query().Get("query")
	if query == "" {
		query = "*"
	}

	if h.MemoryClient == nil {
		writeError(w, http.StatusServiceUnavailable, "memory service not configured")
		return
	}

	// Build recall request
	recallReq := service.RecallRequest{
		Query: query,
		Tags:  tags,
		Limit: 100,
	}

	// If agent_id is provided, add to tags
	if agentID != "" {
		if recallReq.Tags == nil {
			recallReq.Tags = []string{}
		}
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
