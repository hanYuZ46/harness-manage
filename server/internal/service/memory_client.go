package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// MemoryClient provides HTTP client methods for memory service
type MemoryClient struct {
	baseURL   string
	authToken string
	client    *http.Client
	logger    *slog.Logger
}

// NewMemoryClient creates a new memory service client
func NewMemoryClient(baseURL, authToken string, logger *slog.Logger) *MemoryClient {
	if logger == nil {
		logger = slog.Default()
	}
	return &MemoryClient{
		baseURL:   baseURL,
		authToken: authToken,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// doRequest is a helper method to execute HTTP requests
func (c *MemoryClient) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}
		reqBody = bytes.NewReader(data)
	}

	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("memory API error (%d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// CreateBank creates a new memory bank
func (c *MemoryClient) CreateBank(ctx context.Context, bankID, name string) error {
	req := CreateBankRequest{
		Name: name,
		Metadata: map[string]string{
			"type": "workspace",
		},
	}

	path := fmt.Sprintf("/v1/default/banks/%s", bankID)
	_, err := c.doRequest(ctx, http.MethodPut, path, req)
	if err != nil {
		return fmt.Errorf("create bank %s: %w", bankID, err)
	}

	c.logger.Info("memory bank created", "bank_id", bankID, "name", name)
	return nil
}

// Retain stores memories to the specified bank
func (c *MemoryClient) Retain(ctx context.Context, bankID string, req RetainRequest) error {
	path := fmt.Sprintf("/v1/default/banks/%s/memories", bankID)
	_, err := c.doRequest(ctx, http.MethodPost, path, req)
	if err != nil {
		return fmt.Errorf("retain memory: %w", err)
	}

	c.logger.Debug("memory retained", "bank_id", bankID, "items", len(req.Items))
	return nil
}

// Recall searches memories in the specified bank
func (c *MemoryClient) Recall(ctx context.Context, bankID string, req RecallRequest) ([]MemoryItem, error) {
	path := fmt.Sprintf("/v1/default/banks/%s/memories/recall", bankID)
	respBody, err := c.doRequest(ctx, http.MethodPost, path, req)
	if err != nil {
		return nil, err
	}

	var recallResp RecallResponse
	if err := json.Unmarshal(respBody, &recallResp); err != nil {
		return nil, fmt.Errorf("unmarshal recall response: %w", err)
	}

	return recallResp.Memories, nil
}

// GetBankProfile retrieves the profile of a memory bank
func (c *MemoryClient) GetBankProfile(ctx context.Context, bankID string) (*BankProfile, error) {
	path := fmt.Sprintf("/v1/default/banks/%s/profile", bankID)
	respBody, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var profile BankProfile
	if err := json.Unmarshal(respBody, &profile); err != nil {
		return nil, fmt.Errorf("unmarshal bank profile: %w", err)
	}

	return &profile, nil
}

// DeleteBank deletes a memory bank and all its contents
func (c *MemoryClient) DeleteBank(ctx context.Context, bankID string) error {
	path := fmt.Sprintf("/v1/default/banks/%s", bankID)
	_, err := c.doRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return fmt.Errorf("delete bank %s: %w", bankID, err)
	}

	c.logger.Info("memory bank deleted", "bank_id", bankID)
	return nil
}
