"use client";

import { useState, useMemo } from "react";

interface ResultsGridProps {
  rows: Record<string, unknown>[];
}

export function ResultsGrid({ rows }: ResultsGridProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="text-left py-2 px-2 text-text-tertiary font-medium cursor-pointer hover:text-text select-none"
              >
                {col}
                {sortCol === col && (
                  <span className="ml-1 text-accent">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-border-subtle hover:bg-surface-2/50"
            >
              {columns.map((col) => {
                const val = row[col];
                return (
                  <td key={col} className="py-2 px-2 text-text">
                    {val === null
                      ? "—"
                      : typeof val === "number"
                        ? val.toLocaleString()
                        : String(val).slice(0, 50)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
