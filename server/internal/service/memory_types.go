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
	Items        []MemoryItem `json:"items"`
	Async        bool         `json:"async,omitempty"`
	FactType     string       `json:"fact_type,omitempty"` // 记忆类型：world | experience
	DocumentTags []string     `json:"document_tags,omitempty"`
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
// Note: The enn-memory service returns results in a complex structure
type RecallResponse struct {
	Results      []MemoryResult `json:"results"`
	Trace        interface{}    `json:"trace"`
	Entities     interface{}    `json:"entities"`
	Chunks       interface{}    `json:"chunks"`
	SourceFacts  interface{}    `json:"source_facts"`
}

// MemoryResult represents a single memory result from recall
type MemoryResult struct {
	ID        string            `json:"id,omitempty"`
	Content   string            `json:"content"`
	Context   string            `json:"context,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	Tags      []string          `json:"tags,omitempty"`
	Timestamp *time.Time        `json:"timestamp,omitempty"`
	Score     float64           `json:"score,omitempty"`
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
