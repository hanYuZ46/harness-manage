package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestMemoryClient(handler http.HandlerFunc) (*MemoryClient, *httptest.Server) {
	server := httptest.NewServer(handler)
	client := NewMemoryClient(server.URL, "test-token", slog.Default())
	return client, server
}

func TestMemoryClient_CreateBank(t *testing.T) {
	var receivedPath string
	var receivedBody CreateBankRequest

	client, server := newTestMemoryClient(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		json.NewDecoder(r.Body).Decode(&receivedBody)
		w.WriteHeader(http.StatusOK)
	})
	defer server.Close()

	ctx := context.Background()
	err := client.CreateBank(ctx, "ws-test-123", "Test Workspace")

	require.NoError(t, err)
	assert.Contains(t, receivedPath, "/v1/default/banks/ws-test-123")
	assert.Equal(t, "Test Workspace", receivedBody.Name)
}

func TestMemoryClient_Retain(t *testing.T) {
	var receivedBody RetainRequest

	client, server := newTestMemoryClient(func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&receivedBody)
		w.WriteHeader(http.StatusOK)
	})
	defer server.Close()

	ctx := context.Background()
	err := client.Retain(ctx, "ws-test-123", RetainRequest{
		Items: []MemoryItem{
			{Content: "Test memory", Context: "test"},
		},
	})

	require.NoError(t, err)
	require.Len(t, receivedBody.Items, 1)
	assert.Equal(t, "Test memory", receivedBody.Items[0].Content)
}

func TestMemoryClient_Recall(t *testing.T) {
	client, server := newTestMemoryClient(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RecallResponse{
			Results: []MemoryResult{
				{ID: "mem-1", Content: "Memory 1"},
				{ID: "mem-2", Content: "Memory 2"},
			},
		})
	})
	defer server.Close()

	ctx := context.Background()
	memories, err := client.Recall(ctx, "ws-test-123", RecallRequest{
		Query: "test",
	})

	require.NoError(t, err)
	require.Len(t, memories, 2)
	assert.Equal(t, "Memory 1", memories[0].Content)
}

func TestMemoryClient_GetBankProfile(t *testing.T) {
	client, server := newTestMemoryClient(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(BankProfile{
			BankID: "ws-test-123",
			Name:   "Test Workspace",
		})
	})
	defer server.Close()

	ctx := context.Background()
	profile, err := client.GetBankProfile(ctx, "ws-test-123")

	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.Equal(t, "ws-test-123", profile.BankID)
	assert.Equal(t, "Test Workspace", profile.Name)
}

func TestMemoryClient_ErrorHandling(t *testing.T) {
	client, server := newTestMemoryClient(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "internal error"}`))
	})
	defer server.Close()

	ctx := context.Background()
	err := client.Retain(ctx, "ws-test-123", RetainRequest{})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "500")
}
