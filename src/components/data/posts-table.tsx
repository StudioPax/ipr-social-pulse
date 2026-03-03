// @component PostsTable — Data table for collected posts
// Uses shadcn/ui Table + TanStack Table v8
"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Post {
  id: string;
  platform: string;
  post_id: string;
  content_text: string | null;
  content_url: string | null;
  published_at: string | null;
  likes: number | null;
  reposts: number | null;
  comments: number | null;
  engagement_total: number | null;
  hashtags: string[] | null;
  content_format: string | null;
  authors: string[] | null;
  pillar_tag: string | null;
  collected_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  bluesky: "bg-[#0085FF] text-white",
  twitter: "bg-[#1DA1F2] text-white",
  linkedin: "bg-[#0A66C2] text-white",
  facebook: "bg-[#1877F2] text-white",
  instagram: "bg-[#E4405F] text-white",
};

const PILLAR_COLORS: Record<string, string> = {
  Health: "bg-emerald-100 text-emerald-800",
  Democracy: "bg-blue-100 text-blue-800",
  Methods: "bg-violet-100 text-violet-800",
  Opportunity: "bg-amber-100 text-amber-800",
  Sustainability: "bg-green-100 text-green-800",
};

export function PostsTable({ posts }: { posts: Post[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "published_at", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "platform",
        header: "Platform",
        size: 100,
        cell: ({ row }) => {
          const platform = row.getValue("platform") as string;
          return (
            <Badge
              className={`text-[10px] ${PLATFORM_COLORS[platform] || "bg-muted"}`}
            >
              {platform}
            </Badge>
          );
        },
      },
      {
        accessorKey: "content_text",
        header: "Content",
        size: 400,
        cell: ({ row }) => {
          const text = row.getValue("content_text") as string | null;
          const url = row.original.content_url;
          return (
            <div className="max-w-[400px]">
              <p className="text-sm truncate">{text || "—"}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  View post
                </a>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "published_at",
        header: "Published",
        size: 120,
        cell: ({ row }) => {
          const date = row.getValue("published_at") as string | null;
          if (!date) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "engagement_total",
        header: "Engagement",
        size: 100,
        cell: ({ row }) => {
          const total = row.getValue("engagement_total") as number | null;
          const likes = row.original.likes || 0;
          const reposts = row.original.reposts || 0;
          const comments = row.original.comments || 0;
          return (
            <div className="text-right">
              <span className="font-mono text-sm font-medium">
                {total?.toLocaleString() ?? "0"}
              </span>
              <div className="text-[10px] text-muted-foreground">
                {likes}L {reposts}R {comments}C
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "pillar_tag",
        header: "Pillar",
        size: 120,
        cell: ({ row }) => {
          const pillar = row.getValue("pillar_tag") as string | null;
          if (!pillar) {
            return (
              <span className="text-xs text-muted-foreground italic">
                Untagged
              </span>
            );
          }
          return (
            <Badge className={`text-[10px] ${PILLAR_COLORS[pillar] || "bg-muted"}`}>
              {pillar}
            </Badge>
          );
        },
      },
      {
        accessorKey: "content_format",
        header: "Type",
        size: 80,
        cell: ({ row }) => {
          const format = row.getValue("content_format") as string | null;
          return (
            <span className="text-xs capitalize text-muted-foreground">
              {format || "—"}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: posts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search posts..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} posts
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No posts found. Run a collection first.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
