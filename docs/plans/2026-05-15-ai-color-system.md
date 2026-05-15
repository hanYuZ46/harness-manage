# AI Color System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete AI color system across all AI-related UI components to help users visually identify AI functionality and build consistent mental models.

**Architecture:** Add AI-specific design tokens to the existing token-based CSS architecture, then apply them consistently across Agent, Chat, and Issue components using Tailwind utility classes.

**Tech Stack:** CSS Variables, Tailwind CSS, React/TypeScript, shadcn/ui components

---

## Design Tokens Reference

### AI Basic Colors (Hex values, no conversion)
```css
--ai-blue: #4B7AFF
--ai-purple: #AF52DE
--ai-aqua: #32ACE6
```

### AI Gradient (135deg, top-left to bottom-right)
```css
--ai-gradient: linear-gradient(135deg, #4B7AFF 0%, #AF52DE 50%, #32ACE6 100%)
```

### AI Background Colors
```css
/* Light mode */
--ai-background: rgba(75, 122, 255, 0.08)
/* Dark mode */
--ai-background-dark: rgba(75, 122, 255, 0.15)
```

### AI Ambient Color (for generation progress animations)
```css
--ai-ambient: rgba(175, 82, 222, 0.3)
```

---

## Component Mapping

| Component Category | Files to Modify | AI Color Application |
|-------------------|-----------------|---------------------|
| **Agent Components** | | |
| AgentPresenceIndicator | `packages/views/agents/components/agent-presence-indicator.tsx` | Gradient dot, background chip |
| AgentProfileCard | `packages/views/agents/components/agent-profile-card.tsx` | Gradient border, header |
| AgentRow | `packages/views/agents/components/agent-columns.tsx` | AI background hover |
| CreateAgentDialog | `packages/views/agents/components/create-agent-dialog.tsx` | Gradient header |
| **Chat Components** | | |
| ChatMessageList | `packages/views/chat/components/chat-message-list.tsx` | AI message background |
| AssistantMessage | `packages/views/chat/components/chat-message-list.tsx` | Gradient text, border |
| ChatInput | `packages/views/chat/components/chat-input.tsx` | AI indicator |
| **Issue Components** | | |
| AgentLiveCard | `packages/views/issues/components/agent-live-card.tsx` | Gradient border, ambient glow |
| ExecutionLogSection | `packages/views/issues/components/execution-log-section.tsx` | Timeline gradient |
| **Shared Components** | | |
| ActorAvatar | `packages/views/common/actor-avatar.tsx` | AI avatar ring |
| TaskTranscript | `packages/views/common/task-transcript/agent-transcript-dialog.tsx` | Gradient header |

---

## Implementation Tasks

### Task 1: Add AI Color Tokens

**Files:**
- Modify: `packages/ui/styles/tokens.css`

**Step 1: Add AI color tokens to :root**

Add after line 99 (after `--scrollbar-track`):

```css
/* AI Colors — used across AI functionality */
--ai-blue: #4B7AFF;
--ai-purple: #AF52DE;
--ai-aqua: #32ACE6;
--ai-gradient: linear-gradient(135deg, #4B7AFF 0%, #AF52DE 50%, #32ACE6 100%);
--ai-background: rgba(75, 122, 255, 0.08);
--ai-ambient: rgba(175, 82, 222, 0.3);
```

**Step 2: Add dark mode AI colors**

Add after line 145 (in `.dark` block):

```css
/* AI Colors — Dark mode variants */
--ai-background: rgba(75, 122, 255, 0.15);
--ai-ambient: rgba(175, 82, 222, 0.4);
```

**Step 3: Verify tokens compile**

Run: `cd apps/web && pnpm dev`
Expected: No CSS errors, tokens available in browser devtools

**Step 4: Commit**

```bash
git add packages/ui/styles/tokens.css
git commit -m "feat(ai-colors): add AI design tokens"
```

---

### Task 2: Agent Presence Indicator

**Files:**
- Modify: `packages/views/agents/components/agent-presence-indicator.tsx`
- Test: `packages/views/agents/components/agent-presence-indicator.test.tsx` (if exists)

**Step 1: Add gradient dot variant**

Modify the availability dot rendering (line 68):

```tsx
<span
  className={cn(
    "h-1.5 w-1.5 shrink-0 rounded-full",
    detail.availability === "online"
      ? "bg-[var(--ai-blue)]"
      : av.dotClass
  )}
/>
```

**Step 2: Add AI background to chip**

Modify the workload chip container (line 74):

```tsx
<span
  className={cn(
    "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
    detail.availability === "online" && "rounded-md bg-[var(--ai-background)] px-1.5 py-0.5"
  )}
>
```

**Step 3: Run tests**

Run: `pnpm --filter @multica/views exec vitest run agents/components/agent-presence-indicator.test.tsx`
Expected: PASS (or create test if missing)

**Step 4: Commit**

```bash
git add packages/views/agents/components/agent-presence-indicator.tsx
git commit -m "feat(ai-colors): apply to agent presence indicator"
```

---

### Task 3: Agent Profile Card

**Files:**
- Modify: `packages/views/agents/components/agent-profile-card.tsx`

**Step 1: Add gradient border**

Find the card container and add:

```tsx
<div className={cn(
  "rounded-lg border p-4",
  "border-[var(--ai-blue)]/20",
  "bg-gradient-to-br from-[var(--ai-blue)]/5 via-[var(--ai-purple)]/5 to-[var(--ai-aqua)]/5"
)}>
```

**Step 2: Add gradient header**

For the agent name/title:

```tsx
<h3 className="text-lg font-semibold bg-[var(--ai-gradient)] bg-clip-text text-transparent">
  {agent.name}
</h3>
```

**Step 3: Verify visual**

Run: `pnpm dev:web`
Navigate to: Agents page → Any agent card
Expected: Gradient border and text, subtle background tint

**Step 4: Commit**

```bash
git add packages/views/agents/components/agent-profile-card.tsx
git commit -m "feat(ai-colors): apply to agent profile card"
```

---

### Task 4: Chat Message AI Styling

**Files:**
- Modify: `packages/views/chat/components/chat-message-list.tsx`

**Step 1: Add AI background to AssistantMessage**

Modify AssistantMessage component (line 202):

```tsx
return (
  <div className="w-full space-y-1.5 rounded-lg bg-[var(--ai-background)] p-3 border border-[var(--ai-blue)]/10">
    {timeline.length > 0 ? (
      <TimelineView items={timeline} />
    ) : (
      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
        <Markdown>{message.content}</Markdown>
      </div>
    )}
    <MessageFooter message={message} timeline={timeline} isPending={isPending} />
  </div>
);
```

**Step 2: Add gradient to AI tool icons**

Modify ToolCallRow (line 520):

```tsx
<span className="font-medium bg-[var(--ai-gradient)] bg-clip-text text-transparent shrink-0">
  {item.tool}
</span>
```

**Step 3: Run tests**

Run: `pnpm --filter @multica/views exec vitest run chat/components/chat-message-list.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/views/chat/components/chat-message-list.tsx
git commit -m "feat(ai-colors): apply to chat messages"
```

---

### Task 5: Agent Live Card

**Files:**
- Modify: `packages/views/issues/components/agent-live-card.tsx`

**Step 1: Add gradient border to SingleAgentLiveCard**

Modify the card container (line 313):

```tsx
return (
  <div className={cn(
    "rounded-lg border px-3 py-2",
    isQueued
      ? "border-border bg-muted/30"
      : "border-[var(--ai-blue)]/20 bg-[var(--ai-background)] animate-ai-pulse"
  )}>
```

**Step 2: Add ambient animation**

Add CSS keyframes to `apps/web/app/custom.css`:

```css
@keyframes ai-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(175, 82, 222, 0.3);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(175, 82, 222, 0.1);
  }
}

.animate-ai-pulse {
  animation: ai-pulse 2s ease-in-out infinite;
}
```

**Step 3: Update Loader icon color**

Modify line 327:

```tsx
<Loader2 className="h-3 w-3 animate-spin text-[var(--ai-blue)] shrink-0" />
```

**Step 4: Run tests**

Run: `pnpm --filter @multica/views exec vitest run issues/components/agent-live-card.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/views/issues/components/agent-live-card.tsx apps/web/app/custom.css
git commit -m "feat(ai-colors): apply to agent live card with ambient animation"
```

---

### Task 6: Actor Avatar AI Ring

**Files:**
- Modify: `packages/views/common/actor-avatar.tsx`

**Step 1: Add AI ring for agent avatars**

Find the avatar rendering and add:

```tsx
<div className={cn(
  "relative",
  actorType === "agent" && "before:absolute before:-inset-0.5 before:rounded-full before:border-2 before:border-[var(--ai-gradient)]"
)}>
  {/* Existing avatar */}
</div>
```

**Step 2: Run tests**

Run: `pnpm --filter @multica/views exec vitest run common/actor-avatar.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/views/common/actor-avatar.tsx
git commit -m "feat(ai-colors): add gradient ring to agent avatars"
```

---

### Task 7: Execution Log Section

**Files:**
- Modify: `packages/views/issues/components/execution-log-section.tsx`

**Step 1: Add gradient to timeline items**

```tsx
<div className="border-l-2 border-[var(--ai-gradient)] pl-4">
  {/* Timeline content */}
</div>
```

**Step 2: Add AI color to step indicators**

```tsx
<div className="h-2 w-2 rounded-full bg-[var(--ai-gradient)]" />
```

**Step 3: Commit**

```bash
git add packages/views/issues/components/execution-log-section.tsx
git commit -m "feat(ai-colors): apply to execution log"
```

---

### Task 8: Visual Verification

**Files:** All modified components

**Step 1: Start dev server**

Run: `pnpm dev:web`

**Step 2: Verify each component**

Navigate to:
1. `/agents` — Check AgentProfileCard, AgentPresenceIndicator
2. `/chat` — Check ChatMessageList, AssistantMessage
3. `/issues/[id]` — Check AgentLiveCard, ExecutionLogSection

**Step 3: Check dark mode**

Toggle dark mode in browser devtools
Expected: AI colors visible, dark mode backgrounds correct

**Step 4: Check responsiveness**

Resize browser to mobile width
Expected: AI colors scale correctly

**Step 5: Create verification checklist**

```markdown
## AI Color Verification

- [ ] Agent presence indicator shows gradient dot
- [ ] Agent profile card has gradient border
- [ ] Chat messages have AI background
- [ ] Agent live card has ambient animation
- [ ] Agent avatars have gradient ring
- [ ] Execution log has gradient timeline
- [ ] Dark mode renders correctly
- [ ] Mobile responsive
```

**Step 6: Commit verification**

```bash
git add docs/plans/2026-05-15-ai-color-system.md
git commit -m "docs: add AI color system implementation plan with verification checklist"
```

---

## Final Steps

### Task 9: Documentation Update

**Files:**
- Create: `packages/ui/docs/ai-colors.md`

**Step 1: Write usage guide**

```markdown
# AI Colors Usage Guide

## When to Use

- AI-generated content containers
- Agent-related UI elements
- Chat messages from AI
- Task execution indicators

## When NOT to Use

- User-generated content
- Non-AI system messages
- General UI decoration

## Available Tokens

| Token | Usage | Example |
|-------|-------|---------|
| `--ai-blue` | Primary AI color | `text-[var(--ai-blue)]` |
| `--ai-purple` | Secondary AI color | `border-[var(--ai-purple)]` |
| `--ai-aqua` | Accent AI color | `bg-[var(--ai-aqua)]` |
| `--ai-gradient` | Gradient fills | `bg-[var(--ai-gradient)]` |
| `--ai-background` | Container backgrounds | `bg-[var(--ai-background)]` |
| `--ai-ambient` | Animations | `box-shadow: var(--ai-ambient)` |
```

**Step 2: Commit**

```bash
git add packages/ui/docs/ai-colors.md
git commit -m "docs: add AI colors usage guide"
```

---

### Task 10: Final Review

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No lint errors

**Step 4: Create PR**

```bash
git push origin web-dev
```

---

## Success Criteria

1. All AI-related components use consistent AI colors
2. Dark mode renders correctly
3. No visual regressions in non-AI components
4. All tests pass
5. Performance impact < 1ms render time increase
6. Accessibility contrast ratios maintained (4.5:1 for text)

---

## Rollback Plan

If issues arise:
1. Revert individual commits as needed
2. Tokens are additive — safe to keep even if component changes revert
3. No breaking changes to existing APIs

---

## Related Skills

- @superpowers:executing-plans — Implement task-by-task
- @superpowers:verification-before-completion — Verify visual design
- @code-review-swarm — Review color application consistency
