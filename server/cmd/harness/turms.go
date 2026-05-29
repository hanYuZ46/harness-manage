package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// turmsClient is a minimal Turms IM admin API client used by the CLI to add
// workspace members to an existing IM group. It only supports the add-member
// operation — group creation stays on the server / is done manually in Turms.
type turmsClient struct {
	baseURL    string
	httpClient *http.Client
	authHeader string
}

type turmsAddMemberRequest struct {
	GroupID  string `json:"groupId"`
	UserID   int64  `json:"userId"`
	Name     string `json:"name"`
	Role     string `json:"role"` // "OWNER" | "MANAGER" | "MEMBER" | "GUEST"
	JoinDate string `json:"joinDate,omitempty"`
}

type turmsAddMemberResponse struct {
	Code int64  `json:"code"`
	Data any    `json:"data"`
	Msg  string `json:"msg"`
}

// turmsMember describes a workspace member to add to a group.
type turmsMember struct {
	UserID int64
	Name   string
	Role   string
}

// newTurmsClientFromEnv builds a Turms client from environment variables,
// matching the harness-manager server defaults so behaviour is identical.
func newTurmsClientFromEnv() *turmsClient {
	baseURL := os.Getenv("TURMS_SERVICE_URL")
	if baseURL == "" {
		baseURL = "https://enn-turms-service-admin.fat.ennew.com"
	}

	username := os.Getenv("TURMS_API_USERNAME")
	if username == "" {
		username = "api-develop"
	}

	password := os.Getenv("TURMS_API_PASSWORD")
	if password == "" {
		password = "api-develop"
	}

	credentials := fmt.Sprintf("%s:%s", username, password)
	authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(credentials))

	return &turmsClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		authHeader: authHeader,
	}
}

// addGroupMember adds a single member to a group on behalf of requesterID.
// requesterID is the Turms userId of the caller, who must already be in the
// group (owner/manager); otherwise Turms returns error 3407.
func (c *turmsClient) addGroupMember(ctx context.Context, groupID string, userID int64, name, role, joinDate string, requesterID int64) error {
	reqBody := turmsAddMemberRequest{
		GroupID:  groupID,
		UserID:   userID,
		Name:     name,
		Role:     role,
		JoinDate: joinDate,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	// Turms admin API uses the requesterId query param to identify the actor.
	url := fmt.Sprintf("%s/groups/members?requesterId=%d", c.baseURL, requesterID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonData))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Authorization", c.authHeader)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var respBody turmsAddMemberResponse
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	// Turms API: code 1000 = success.
	if respBody.Code != 1000 {
		return fmt.Errorf("turms api error: code=%d, msg=%s", respBody.Code, respBody.Msg)
	}

	return nil
}

// addGroupMembers adds members one by one, collecting per-member failures so a
// single bad member does not abort the whole batch.
func (c *turmsClient) addGroupMembers(ctx context.Context, groupID string, members []turmsMember, requesterID int64) (added int, failed []string) {
	now := time.Now().Format(time.RFC3339)
	for _, m := range members {
		if err := c.addGroupMember(ctx, groupID, m.UserID, m.Name, m.Role, now, requesterID); err != nil {
			failed = append(failed, fmt.Sprintf("%s (%d): %v", m.Name, m.UserID, err))
			continue
		}
		added++
	}
	return added, failed
}

// turmsUserIDFromEmail extracts the Turms userId from an ENN email — the
// numeric prefix before '@'. Returns 0 if the prefix is not all digits.
func turmsUserIDFromEmail(email string) int64 {
	at := strings.Index(email, "@")
	if at <= 0 {
		return 0
	}
	var userID int64
	for _, ch := range email[:at] {
		if ch < '0' || ch > '9' {
			return 0
		}
		userID = userID*10 + int64(ch-'0')
	}
	return userID
}
