import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ProspectTabGeneral from "./ProspectTabGeneral";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [] }) }) }) }),
  },
}));

// jsdom does not implement scrolling; keep the actual Radix controls in this test.
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

function renderForm(segment = "b2c", city: string | null = null) {
  const onUpdate = vi.fn();
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Novo Cliente</DialogTitle>
        <ProspectTabGeneral
          prospect={{ id: "test-prospect", name: "Novo Cliente", segment, city }}
          stages={[]}
          segment="b2c"
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>,
  );
  return onUpdate;
}

describe("client classification inside a dialog", () => {
  it("hydrates, edits and clears city without dropping the rest of the update", () => {
    const onUpdate = renderForm("b2c", "São Paulo");
    const city = screen.getByRole("textbox", { name: "Localização (Cidade)" });
    expect(city).toHaveValue("São Paulo");
    fireEvent.change(city, { target: { value: "Alto Paraíso de Goiás" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      city: "Alto Paraíso de Goiás", name: "Novo Cliente", segment: "b2c",
    }));
    fireEvent.change(city, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ city: null }));
  });

  it("can submit a legacy client with no city", () => {
    const onUpdate = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ city: null, name: "Novo Cliente" }));
  });

  it("opens the real select, switches both ways and submits the selected segment", async () => {
    const onUpdate = renderForm();
    const trigger = screen.getByRole("combobox", { name: "Classificação (Segmento)" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "B2B (Empresa)" }));
    await waitFor(() => expect(trigger).toHaveTextContent("B2B (Empresa)"));
    expect(screen.getByText("Tipo Empresa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ segment: "b2b" }));

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "B2C (Turista)" }));
    expect(screen.queryByText("Tipo Empresa")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ segment: "b2c" }));
  });

  it("uses the saved client's B2B segment when opened from the general/B2C listing", () => {
    renderForm("b2b");
    expect(screen.getByRole("combobox", { name: "Classificação (Segmento)" })).toHaveTextContent("B2B (Empresa)");
    expect(screen.getByText("Nome Empresa *")).toBeInTheDocument();
    expect(screen.getByText("Tipo Empresa")).toBeInTheDocument();
  });
});
