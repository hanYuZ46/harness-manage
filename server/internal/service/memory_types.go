package service

import (
	"time"
)

// MemoryItem represents a single memory entry
type MemoryItem struct {
	ID        string            `json:"id,omitempty"`
	Content   string            `json:"content"`
	Context   string            `json:"context,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	Tags      []string          `json:"tags,omitempty"`
	Timestamp *time.Time        `json:"timestamp,omitempty"`
}

// RetainRequest is the request body for storing memories
type RetainRequest struct {
	Items []MemoryItem `json:"items"`
	Async bool         `json:"async,omitempty"`
}

// RetainResponse is the response body for retain operation
type RetainResponse struct {
	MemoryIDs []string `json:"memory_ids"`
	Status    string   `json:"status"`
}

// RecallRequest is the request body for searching memories
type RecallRequest struct {
	Query     string   `json:"query"`
	Tags      []string `json:"tags,omitempty"`
	Types     []string `json:"types,omitempty"`
	Limit     int      `json:"limit,omitempty"`
	MaxTokens int      `json:"max_tokens,omitempty"`
}

// RecallResponse is the response body for recall operation
type RecallResponse struct {
	Memories []MemoryItem `json:"memories"`
	Query    string       `json:"query"`
}

// CreateBankRequest is the request body for creating a memory bank
type CreateBankRequest struct {
	Name     string            `json:"name"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// BankProfile represents a memory bank's profile
type BankProfile struct {
	BankID    string            `json:"bank_id"`
	Name      string            `json:"name"`
	CreatedAt time.Time         `json:"created_at"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}
