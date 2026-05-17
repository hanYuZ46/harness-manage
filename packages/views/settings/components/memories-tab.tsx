"use client";

import { Brain } from "lucide-react";
import { useCurrentWorkspace } from "@multica/core/paths";
import { useT } from "../../i18n";
import { MemoryGraphPage } from "./memory-graph-page";

export function MemoriesTab() {
  const { t } = useT("memories");
  const workspace = useCurrentWorkspace();

  if (!workspace) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">{t(($) => $.space_memory_title)}</h2>
      </div>
      <MemoryGraphPage />
    </div>
  );
}
