"use client";

import { useState } from "react";
import { Search, Brain, Calendar, User } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { useMemories } from "@multica/core/memory";
import { useCurrentWorkspace } from "@multica/core/paths";
import { useT } from "../../i18n";
import type { MemoryItem } from "@multica/core/types";

export function MemoriesTab() {
  const { t } = useT("memories");
  const workspace = useCurrentWorkspace();
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useMemories(workspace?.id ?? "", {
    query: query || undefined,
  });

  if (!workspace) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">{t(($) => $.title)}</h2>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t(($) => $.search_placeholder)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button size="sm">
              <Search className="h-4 w-4" />
              {t(($) => $.search)}
            </Button>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">{t(($) => $.loading)}</p>}
          {error && <p className="text-sm text-destructive">{t(($) => $.error)}</p>}
          {!isLoading && !error && data?.memories.length === 0 && (
            <p className="text-sm text-muted-foreground">{t(($) => $.empty)}</p>
          )}

          <div className="space-y-2">
            {data?.memories.map((memory: MemoryItem) => (
              <Card key={memory.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm">{memory.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {memory.metadata?.agent_id && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {memory.metadata.agent_id}
                      </span>
                    )}
                    {memory.timestamp && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(memory.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
