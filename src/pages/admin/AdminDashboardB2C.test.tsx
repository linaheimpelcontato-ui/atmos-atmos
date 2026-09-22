import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminDashboardB2C from "./AdminDashboardB2C";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query,
      then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [] }).then(resolve) };
    return query;
  },
} }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));
vi.mock("recharts", () => {
  const Chart = ({ children }: any) => <div>{children}</div>;
  const Empty = () => null;
  return { ResponsiveContainer: Chart, BarChart: Chart, PieChart: Chart, AreaChart: Chart, Pie: Chart,
    Bar: Empty, Area: Empty, Cell: Empty, CartesianGrid: Empty, XAxis: Empty, YAxis: Empty,
    Tooltip: ({ cursor, contentStyle }: any) => <div data-testid="chart-tooltip"
      data-cursor-fill={cursor?.fill} data-border={contentStyle?.border} /> };
});
afterEach(cleanup);

it("uses the admin HSL tokens as translucent HSL colors, not invalid RGBA values", async () => {
  render(<MemoryRouter><AdminDashboardB2C /></MemoryRouter>);
  const tooltips = await screen.findAllByTestId("chart-tooltip");
  expect(tooltips[0]).toHaveAttribute("data-cursor-fill", "hsl(var(--admin-primary) / 0.03)");
  for (const tooltip of tooltips) {
    expect(tooltip).toHaveAttribute("data-border", "1px solid hsl(var(--admin-border) / 0.4)");
  }
});
