"use client";

import { useState } from "react";
import { Plus, Zap, Play, Pause, AlertCircle, Brain, Sparkles, ClipboardCheck, Award, GitPullRequest, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { autopilotListOptions } from "@multica/core/autopilots/queries";
import { useWorkspaceId } from "@multica/core/hooks";
import { useWorkspacePaths } from "@multica/core/paths";
import { useActorName } from "@multica/core/workspace/hooks";
import { AppLink } from "../../navigation";
import { ActorAvatar } from "../../common/actor-avatar";
import { PageHeader } from "../../layout/page-header";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { Button } from "@multica/ui/components/ui/button";
import { cn } from "@multica/ui/lib/utils";
import { AutopilotDialog } from "./autopilot-dialog";
import type { Autopilot, AutopilotStatus, AutopilotExecutionMode } from "@multica/core/types";
import type { TriggerFrequency } from "./trigger-config";
import { useT } from "../../i18n";

// Template-id keyed lookup for the i18n labels. Prompts stay raw English
// because they're injected directly into the agent's task input — translating
// them would also translate the agent's instructions.
type TemplateId =
  | "skill_evaluation"
  | "dream_mode"
  | "task_inspection"
  | "deliverable_quality"
  | "pattern_extraction"
  | "self_improvement";

interface AutopilotTemplate {
  id: TemplateId;
  prompt: string;
  icon: typeof Zap;
  frequency: TriggerFrequency;
  time: string;
}

const TEMPLATES: AutopilotTemplate[] = [
  {
    id: "skill_evaluation",
    prompt: `1. Review all task runs completed by each skill in the past 7 days
2. For each skill, calculate success rate, average quality score, and user feedback trends
3. Identify underperforming skills (success rate < 70% or declining quality)
4. For each underperforming skill, analyze failure patterns and root causes
5. Propose replacements: search the pattern store for better alternatives, or draft improved instructions
6. Post a report on this issue listing: skills to keep, skills to update, skills to retire, and proposed replacements with confidence scores`,
    icon: Award,
    frequency: "weekly",
    time: "09:00",
  },
  {
    id: "dream_mode",
    prompt: `1. Enter offline reflection mode (no external API calls or tool invocations)
2. Replay recent task trajectories from memory (last 24-48 hours)
3. Run consolidation: extract common patterns, identify repeated mistakes
4. Update internal weights via EWC++ — preserve important learned patterns while integrating new ones
5. Generate a "dream journal" entry summarizing insights gained
6. Post the journal as a comment on this issue, tagged with [Dream Mode]`,
    icon: Brain,
    frequency: "daily",
    time: "03:00",
  },
  {
    id: "task_inspection",
    prompt: `1. List all issues with status "done" completed in the past 7 days
2. For each issue, read the full transcript: original request, agent reasoning, tool calls, final output
3. Identify patterns: common success factors, recurring blockers, efficient vs inefficient flows
4. Flag any issues where the agent took unnecessary detours or made avoidable mistakes
5. Extract 3-5 actionable insights for improving agent behavior
6. Post an inspection report on this issue with specific examples and recommendations`,
    icon: ClipboardCheck,
    frequency: "weekly",
    time: "16:00",
  },
  {
    id: "deliverable_quality",
    prompt: `1. Review all agent outputs from the past 7 days (code, documents, plans, summaries)
2. Score each deliverable on: correctness, completeness, clarity, and actionability (1-5 scale)
3. Identify the top 3 and bottom 3 outputs with explanations
4. For low-quality outputs, analyze what went wrong: missing context, wrong tool, ambiguous prompt
5. Propose quality gates: checkpoints the agent should verify before marking a task complete
6. Post a quality report on this issue with scores, examples, and proposed gates`,
    icon: GitPullRequest,
    frequency: "weekly",
    time: "15:00",
  },
  {
    id: "pattern_extraction",
    prompt: `1. Identify all successful task completions from the past 7 days (quality score >= 4.0)
2. For each success, extract the key steps, decisions, and tool sequences that led to success
3. Abstract into reusable patterns: name, when to use, step-by-step recipe, common pitfalls
4. Check the pattern store for duplicates or overlapping patterns
5. Submit new patterns to the ReasoningBank with confidence scores and usage examples
6. Post a summary on this issue listing all extracted patterns with their IDs and intended use cases`,
    icon: Sparkles,
    frequency: "weekly",
    time: "11:00",
  },
  {
    id: "self_improvement",
    prompt: `1. ANALYZE: Review all task outcomes from the past 7 days — successes, failures, escalations
2. LEARN: Run a SONA learning cycle on the trajectory data; update pattern weights with EWC++ consolidation
3. UPDATE: Modify agent instructions based on learned insights; add new skills or retire obsolete ones
4. VALIDATE: Run 3 test tasks to verify improvements didn't break existing capabilities
5. DOCUMENT: Write a changelog entry summarizing what changed and why
6. Post a self-improvement report on this issue with: metrics before/after, changes made, validation results`,
    icon: RefreshCcw,
    frequency: "weekly",
    time: "18:00",
  },
];

// Hook returning a localized "1d ago / Today" formatter for the row's last_run cell.
function useFormatRelativeDate(): (date: string) => string {
  const { t } = useT("autopilots");
  return (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return t(($) => $.relative_date.today);
    if (days === 1) return t(($) => $.relative_date.one_day_ago);
    if (days < 30) return t(($) => $.relative_date.days_ago, { count: days });
    const months = Math.floor(days / 30);
    return t(($) => $.relative_date.months_ago, { count: months });
  };
}

const STATUS_VISUAL: Record<AutopilotStatus, { color: string; icon: typeof Zap }> = {
  active: { color: "text-emerald-500", icon: Play },
  paused: { color: "text-amber-500", icon: Pause },
  archived: { color: "text-muted-foreground", icon: AlertCircle },
};

function AutopilotRow({ autopilot }: { autopilot: Autopilot }) {
  const { t } = useT("autopilots");
  const { getActorName } = useActorName();
  const wsPaths = useWorkspacePaths();
  const formatRelativeDate = useFormatRelativeDate();
  const visual = STATUS_VISUAL[autopilot.status as AutopilotStatus] ?? STATUS_VISUAL.active;
  const StatusIcon = visual.icon;

  return (
    <div className="group/row flex flex-col gap-2 border-b px-4 py-3 text-sm transition-colors hover:bg-accent/40 sm:h-11 sm:flex-row sm:items-center sm:gap-2 sm:border-b-0 sm:px-5 sm:py-0">
      <AppLink
        href={wsPaths.autopilotDetail(autopilot.id)}
        className="flex min-w-0 items-center gap-2 sm:flex-1"
      >
        <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{autopilot.title}</span>
      </AppLink>

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs sm:contents sm:pl-0">
        {/* Agent */}
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground sm:w-32 sm:shrink-0">
          <ActorAvatar actorType="agent" actorId={autopilot.assignee_id} size={18} enableHoverCard showStatusDot />
          <span className="truncate">
            {getActorName("agent", autopilot.assignee_id)}
          </span>
        </span>

        {/* Mode */}
        <span className="text-muted-foreground sm:w-24 sm:shrink-0 sm:text-center">
          {t(($) => $.execution_mode[autopilot.execution_mode as AutopilotExecutionMode])}
        </span>

        {/* Status */}
        <span className={cn("flex items-center gap-1 sm:w-20 sm:shrink-0 sm:justify-center", visual.color)}>
          <StatusIcon className="h-3 w-3" />
          {t(($) => $.status[autopilot.status as AutopilotStatus])}
        </span>

        {/* Last run */}
        <span className="text-muted-foreground tabular-nums sm:w-20 sm:shrink-0 sm:text-right">
          {autopilot.last_run_at ? formatRelativeDate(autopilot.last_run_at) : t(($) => $.page.last_run_empty)}
        </span>
      </div>
    </div>
  );
}

export function AutopilotsPage() {
  const { t } = useT("autopilots");
  const wsId = useWorkspaceId();
  const { data: autopilots = [], isLoading } = useQuery(autopilotListOptions(wsId));
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutopilotTemplate | null>(null);

  const openCreate = (template?: AutopilotTemplate) => {
    setSelectedTemplate(template ?? null);
    setCreateOpen(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <PageHeader className="justify-between px-5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-medium">{t(($) => $.page.title)}</h1>
          {!isLoading && autopilots.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{autopilots.length}</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => openCreate()}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t(($) => $.page.new_autopilot)}
        </Button>
      </PageHeader>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <>
            <div className="sticky top-0 z-[1] hidden h-8 items-center gap-2 border-b bg-muted/30 px-5 sm:flex">
              <span className="shrink-0 w-4" />
              <Skeleton className="h-3 w-12 flex-1 max-w-[48px]" />
              <Skeleton className="h-3 w-12 shrink-0" />
              <Skeleton className="h-3 w-10 shrink-0" />
              <Skeleton className="h-3 w-10 shrink-0" />
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
            <div className="space-y-2 p-4 sm:space-y-1 sm:p-5 sm:pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full sm:h-11" />
              ))}
            </div>
          </>
        ) : autopilots.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-5">
            <Zap className="h-10 w-10 mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">{t(($) => $.page.empty.title)}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              {t(($) => $.page.empty.hint)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/40"
                    onClick={() => openCreate(tpl)}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {t(($) => $.templates[tpl.id].title)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {t(($) => $.templates[tpl.id].summary)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t(($) => $.page.start_blank)}
            </Button>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="sticky top-0 z-[1] hidden h-8 items-center gap-2 border-b bg-muted/30 px-5 text-xs font-medium text-muted-foreground sm:flex">
              <span className="shrink-0 w-4" />
              <span className="min-w-0 flex-1">{t(($) => $.page.table.name)}</span>
              <span className="w-32 shrink-0">{t(($) => $.page.table.agent)}</span>
              <span className="w-24 text-center shrink-0">{t(($) => $.page.table.mode)}</span>
              <span className="w-20 text-center shrink-0">{t(($) => $.page.table.status)}</span>
              <span className="w-20 text-right shrink-0">{t(($) => $.page.table.last_run)}</span>
            </div>
            {autopilots.map((autopilot) => (
              <AutopilotRow key={autopilot.id} autopilot={autopilot} />
            ))}
          </>
        )}
      </div>

      {createOpen && (
        <AutopilotDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          initial={
            selectedTemplate
              ? {
                  // Template title pulls from i18n so the user-visible default
                  // matches their locale, while the prompt body stays raw EN
                  // since it's injected directly into the agent task.
                  title: t(($) => $.templates[selectedTemplate.id].title),
                  description: selectedTemplate.prompt,
                }
              : undefined
          }
          initialTriggerConfig={
            selectedTemplate
              ? { frequency: selectedTemplate.frequency, time: selectedTemplate.time }
              : undefined
          }
        />
      )}
    </div>
  );
}
