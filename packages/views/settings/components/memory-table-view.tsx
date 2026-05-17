"use client";

import { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@multica/ui/components/ui/table";
import { Badge } from "@multica/ui/components/ui/badge";
import { useMemoryGraphStore } from "@multica/core/memory/graph-store";
import { useT } from "../../i18n";
import type { MemoryGraphTableRow as GraphTableRow } from "@multica/core/types/memory";

const columnHelper = createColumnHelper<GraphTableRow>();

interface MemoryTableViewProps {
  data: GraphTableRow[];
}

export function MemoryTableView({ data }: MemoryTableViewProps) {
  const { t } = useT("memories");
  const { setSelectedNode, selectedNodeId } = useMemoryGraphStore();
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter data based on Zustand store filters
  const { searchQuery, selectedTags } = useMemoryGraphStore();

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Filter by search query
      if (searchQuery && !row.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Filter by tags
      if (selectedTags.length > 0 && row.tags) {
        const hasMatchingTag = selectedTags.some((tag) =>
          row.tags?.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      return true;
    });
  }, [data, searchQuery, selectedTags]);

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("text", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            {t(($) => $.column_content) || "Content"}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="max-w-md truncate text-sm" title={value}>
              {value}
            </div>
          );
        },
      }),
      columnHelper.accessor("entities", {
        header: t(($) => $.column_entities) || "Entities",
        cell: ({ getValue }) => {
          const entities = getValue();
          if (!entities) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {entities.split(", ").slice(0, 3).map((entity, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {entity.trim()}
                </Badge>
              ))}
              {entities.split(", ").length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{entities.split(", ").length - 3}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("tags", {
        header: t(($) => $.column_tags) || "Tags",
        cell: ({ getValue }) => {
          const tags = getValue();
          if (!tags || tags.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-mono bg-amber-500/10 text-amber-700 border-amber-500/20"
                >
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: t(($) => $.column_type) || "Type",
        cell: ({ getValue }) => {
          const type = getValue();
          if (!type) return null;
          const typeLabels: Record<string, string> = {
            experience: t(($) => $.type_experience) || "Experience",
            world: t(($) => $.type_world) || "World",
            opinion: t(($) => $.type_opinion) || "Opinion",
          };
          return (
            <Badge variant="default" className="text-xs">
              {typeLabels[type as keyof typeof typeLabels] || type}
            </Badge>
          );
        },
      }),
      columnHelper.accessor((row) => row.occurred_start || row.mentioned_at, {
        id: "timestamp",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            {t(($) => $.column_time) || "Time"}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return null;
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(value).toLocaleDateString()}
            </span>
          );
        },
      }),
    ],
    [t]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    enableRowSelection: true,
  });

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-auto p-3">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    row.original.id === selectedNodeId
                      ? "bg-muted/50"
                      : undefined
                  }
                  onClick={() => setSelectedNode(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t(($) => $.table_empty) || "No memories found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {t(($) => $.pagination_info, {
            from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            to: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            ),
            total: filteredData.length,
          }) || `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            filteredData.length
          )} of ${filteredData.length}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
