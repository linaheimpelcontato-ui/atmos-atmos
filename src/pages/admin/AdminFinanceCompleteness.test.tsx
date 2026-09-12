import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { format } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminFinanceDashboard from "./AdminFinanceDashboard";
import AdminFinanceLucroMargem from "./AdminFinanceLucroMargem";

const data = vi.hoisted(() => ({ proposals: [] as any[], dayItems: [] as any[], proposalCosts: [], transactions: [],
  guides: [{ id: "guide", name: "Guia Teste", is_active: true }] }));
vi.mock("./finance/useFinanceData", () => ({ useFinanceData: () => data }));
vi.mock("recharts", async importOriginal => ({ ...await importOriginal<object>(), ResponsiveContainer: () => null }));
vi.mock("./finance/financeExport", () => ({ exportOverview: vi.fn() }));

beforeEach(() => {
  data.proposals = [{ id: "p", title: "Proposta Histórica", status: "approved", total: 100, subtotal: 100,
    created_at: format(new Date(), "yyyy-MM-dd"), segment: "b2c", num_people: 1, num_days: 1,
    atmos_service: {}, proposal_accommodations: [{ is_selected: true, payment_type: "hospedagem", num_nights: 1,
      rooms: [{ available: true, units: 1, capacity: 1, cost: 100, price: 150 }] }] }];
  data.dayItems = [{ id: "i", proposal_id: "p", category: "Guia", catalog_item_id: "guide", value: 100,
    cost_price: 50, quantity: 1, commission_percent: 0, day_number: 1 }];
});
afterEach(cleanup);

describe("FIN-09 financial result completeness UI", () => {
  it.each([AdminFinanceDashboard, AdminFinanceLucroMargem])("shows incomplete consolidated results in %s", Page => {
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Resultado incompleto");
    expect(screen.getByText("Lucro parcial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/ })).toBeDisabled();
  });

  it("retains the warning on both the proposal and guide ranking row", () => {
    render(<MemoryRouter><AdminFinanceLucroMargem /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Por Proposta" }));
    expect(screen.getByText(/Resultado incompleto — 1 comissão/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Por Guia" }));
    expect(screen.getByText(/Resultado incompleto — 1 proposta/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("histórico exibido");
  });

  it.each([AdminFinanceDashboard, AdminFinanceLucroMargem])("does not flag a recorded zero commission in %s", Page => {
    data.proposals[0].proposal_accommodations[0].rooms[0].commission_percent = 0;
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Lucro parcial")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/ })).toBeEnabled();
  });
});
