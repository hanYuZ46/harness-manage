package service

import (
	"log/slog"
	"os"
)

// MemoryConfig holds memory service configuration
type MemoryConfig struct {
	BaseURL   string
	AuthToken string
	Enabled   bool
}

// LoadMemoryConfig loads memory service configuration from environment variables
func LoadMemoryConfig() MemoryConfig {
	config := MemoryConfig{
		Enabled: false,
	}

	// Load base URL from environment
	config.BaseURL = os.Getenv("MEMORY_SERVICE_URL")
	if config.BaseURL == "" {
		config.BaseURL = "https://enn-memory.dev.ennew.com"
	}

	// Load auth token from environment
	config.AuthToken = os.Getenv("MEMORY_SERVICE_AUTH_TOKEN")

	// Enable if URL is configured
	config.Enabled = config.BaseURL != ""

	slog.Info("memory service config loaded",
		"enabled", config.Enabled,
		"base_url", config.BaseURL,
		"auth_token_set", config.AuthToken != "")

	return config
}
