import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useSmartFilters } from "./SmartTableHead";

it("combines financial text search, column filters and sort, and clears all", () => {
  const rows = [
    { description: "Guia Ana", amount: 300, status: "paid" },
    { description: "Guia João", amount: 100, status: "pending" },
    { description: "Transfer", amount: 200, status: "paid" },
  ];
  const { result } = renderHook(() => useSmartFilters());
  act(() => { result.current.setSearch(" GUIA "); result.current.handleSort("amount", "asc"); });
  expect(result.current.applyFilters(rows)).toEqual([rows[1], rows[0]]);
  act(() => { result.current.setColumnFilter("status", new Set(["paid"])); });
  expect(result.current.applyFilters(rows)).toEqual([rows[0]]);
  act(() => { result.current.clearAll(); });
  expect(result.current.search).toBe("");
  expect(result.current.applyFilters(rows)).toEqual(rows);
});
