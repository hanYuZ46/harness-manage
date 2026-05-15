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

## Color Values

### Light Mode
- `--ai-blue: #4B7AFF`
- `--ai-purple: #AF52DE`
- `--ai-aqua: #32ACE6`
- `--ai-background: rgba(75, 122, 255, 0.08)`
- `--ai-ambient: rgba(175, 82, 222, 0.3)`

### Dark Mode
- `--ai-background: rgba(75, 122, 255, 0.15)`
- `--ai-ambient: rgba(175, 82, 222, 0.4)`

## Components Using AI Colors

1. **AgentPresenceIndicator** - Online dot and chip background
2. **AgentProfileCard** - Border, background, name gradient
3. **ChatMessageList** - Assistant message background, tool name gradient
4. **AgentLiveCard** - Border, background, pulse animation
5. **ActorAvatar** - Agent avatar ring
6. **ExecutionLogSection** - Timeline border, step indicators
