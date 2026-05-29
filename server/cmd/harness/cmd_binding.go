package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/multica-ai/multica/server/internal/cli"
	"github.com/spf13/cobra"
)

var bindingCmd = &cobra.Command{
	Use:   "binding",
	Short: "Manage IM group bindings for issues",
}

var bindingCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Bind an IM group to an issue",
	Long: `Bind an existing Turms IM group to a Harness issue.

After binding, the "Open Group Chat" button appears in the issue detail panel,
letting team members open the group chat directly from the issue.

Example:
  harness binding create \
    --issue-id ead78284-455f-4605-bdd5-14a1b814b472 \
    --group-id 4117016381756448768`,
	RunE: runBindingCreate,
}

func init() {
	bindingCreateCmd.Flags().String("issue-id", "", "Issue UUID (required)")
	bindingCreateCmd.Flags().String("group-id", "", "Turms IM group ID (required)")
	bindingCreateCmd.Flags().String("group-name", "Issue Discussion", "Display name for the group (optional)")
	bindingCreateCmd.Flags().Int64("requester-id", 0, "Turms userId of the caller, who must already be in the group (default: derived from the logged-in user)")
	bindingCreateCmd.Flags().Bool("skip-members", false, "Only write the binding; do not add workspace members to the group")
	_ = bindingCreateCmd.MarkFlagRequired("issue-id")
	_ = bindingCreateCmd.MarkFlagRequired("group-id")

	bindingCmd.AddCommand(bindingCreateCmd)
}

func runBindingCreate(cmd *cobra.Command, _ []string) error {
	issueID, _ := cmd.Flags().GetString("issue-id")
	groupID, _ := cmd.Flags().GetString("group-id")
	groupName, _ := cmd.Flags().GetString("group-name")
	requesterID, _ := cmd.Flags().GetInt64("requester-id")
	skipMembers, _ := cmd.Flags().GetBool("skip-members")

	client, err := newAPIClient(cmd)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Step 1: resolve workspace_id from the issue.
	// The /api/issues/{id} endpoint accepts both UUID and human-readable ref
	// (e.g. MUL-123) and returns the full issue object including workspace_id.
	var issue map[string]any
	if err := client.GetJSON(ctx, "/api/issues/"+issueID, &issue); err != nil {
		return fmt.Errorf("get issue %q: %w", issueID, err)
	}
	workspaceID, _ := issue["workspace_id"].(string)
	if workspaceID == "" {
		return fmt.Errorf("could not determine workspace_id from issue %q", issueID)
	}
	// --issue-id accepts either a UUID or a human-readable ref (e.g. MUL-123).
	// Bind on the canonical UUID returned by the API, never the raw input, so
	// downstream lookups by UUID resolve.
	entityID, _ := issue["id"].(string)
	if entityID == "" {
		return fmt.Errorf("could not determine issue UUID from issue %q", issueID)
	}

	// Step 2: write the binding.
	payload := map[string]any{
		"entity_type":   "issue",
		"entity_id":     entityID,
		"im_group_id":   groupID,
		"im_group_name": groupName,
		"type_id":       0,
	}

	var result map[string]any
	if err := client.PostJSON(ctx, "/api/workspaces/"+workspaceID+"/group-bindings", payload, &result); err != nil {
		return fmt.Errorf("create binding: %w", err)
	}

	fmt.Fprintf(os.Stdout, "✅ Binding created\n")
	fmt.Fprintf(os.Stdout, "   issue      : %s\n", issueID)
	fmt.Fprintf(os.Stdout, "   workspace  : %s\n", workspaceID)
	fmt.Fprintf(os.Stdout, "   im_group_id: %s\n", groupID)
	fmt.Fprintf(os.Stdout, "   group_name : %s\n", groupName)

	// Step 3: add all workspace members to the IM group (non-fatal).
	// The binding is already written; failing to add members must not fail
	// the command.
	if !skipMembers {
		addWorkspaceMembersToGroup(ctx, client, workspaceID, groupID, requesterID)
	}

	fmt.Fprintf(os.Stdout, "\nThe \"Open Group Chat\" button is now available on this issue.\n")

	return nil
}

// addWorkspaceMembersToGroup fetches the workspace members from the server and
// adds them to the Turms group directly via the Turms admin API. requesterID is
// the Turms userId acting on behalf of the call (must already be in the group);
// when 0, it is derived from the logged-in user via /api/me.
func addWorkspaceMembersToGroup(ctx context.Context, client *cli.APIClient, workspaceID, groupID string, requesterID int64) {
	if requesterID == 0 {
		var me struct {
			Email string `json:"email"`
		}
		if err := client.GetJSON(ctx, "/api/me", &me); err != nil {
			fmt.Fprintf(os.Stderr, "⚠️  skipped adding members: could not resolve current user: %v\n", err)
			return
		}
		requesterID = turmsUserIDFromEmail(me.Email)
		if requesterID == 0 {
			fmt.Fprintf(os.Stderr, "⚠️  skipped adding members: cannot derive Turms userId from %q (pass --requester-id)\n", me.Email)
			return
		}
	}

	var members []struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := client.GetJSON(ctx, "/api/workspaces/"+workspaceID+"/members", &members); err != nil {
		fmt.Fprintf(os.Stderr, "⚠️  skipped adding members: could not list workspace members: %v\n", err)
		return
	}

	var toAdd []turmsMember
	for _, m := range members {
		userID := turmsUserIDFromEmail(m.Email)
		if userID == 0 || userID == requesterID {
			continue // invalid email, or the requester is already in the group
		}
		role := "MEMBER"
		if m.Role == "owner" || m.Role == "admin" {
			role = "MANAGER"
		}
		toAdd = append(toAdd, turmsMember{UserID: userID, Name: m.Name, Role: role})
	}

	if len(toAdd) == 0 {
		fmt.Fprintf(os.Stdout, "   members    : none to add\n")
		return
	}

	turms := newTurmsClientFromEnv()
	added, failed := turms.addGroupMembers(ctx, groupID, toAdd, requesterID)
	fmt.Fprintf(os.Stdout, "   members    : added %d/%d\n", added, len(toAdd))
	for _, f := range failed {
		fmt.Fprintf(os.Stderr, "   ⚠️  add member failed: %s\n", f)
	}
}
