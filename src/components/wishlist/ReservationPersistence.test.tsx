import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { insert, from } = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "fixture", email: "fixture@example.invalid", user_metadata: { full_name: "Fixture", phone: "11999999999" } } }) }));
vi.mock("@/lib/analytics", () => ({ trackQuoteSubmit: vi.fn(), trackWhatsAppClick: vi.fn() }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div> },
}));
import ItineraryReservationForm from "@/components/itineraries/ItineraryReservationForm";
import WishlistReservationForm from "./WishlistReservationForm";

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ insert });
  vi.spyOn(window, "open").mockReturnValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function completeQuestions(container: HTMLElement) {
  for (let step = 0; step < 25; step++) {
    if (screen.queryByRole("button", { name: "Solicitar via WhatsApp" })) return;
    const unsure = screen.queryByRole("button", { name: "Ainda não sei" });
    const input = container.querySelector("input, textarea") as HTMLInputElement | null;
    if (unsure) fireEvent.click(unsure);
    else if (input) fireEvent.change(input, { target: { value: input.type === "number" ? "2" : input.type === "email" ? "fixture@example.invalid" : input.type === "tel" ? "11999999999" : "Fixture" } });
    else {
      const choice = screen.getAllByRole("button").find(b => !/^(Voltar|Próxima|Solicitar Reserva|Solicitar Orçamento)$/.test(b.textContent?.trim() || ""));
      if (choice) fireEvent.click(choice);
    }
    fireEvent.click(screen.getByRole("button", { name: /^(Próxima|Solicitar Reserva|Solicitar Orçamento)$/ }));
  }
  throw new Error("Reservation confirmation was not reached");
}

describe.each(["itinerary", "wishlist"])("%s persistence", kind => {
  it("preserves the form on a failed save, then opens contact only after successful retry without reading CRM", async () => {
    insert.mockResolvedValueOnce({ error: { message: "offline" } }).mockResolvedValueOnce({ error: null });
    const onClose = vi.fn();
    const { container } = render(kind === "itinerary"
      ? <ItineraryReservationForm itinerary={{ id: "fixture-route", name: { pt: "Roteiro", en: "Trip", es: "Ruta" }, duration: 3 }} language="pt" onClose={onClose} />
      : <WishlistReservationForm items={[{ id: "fixture-waterfall", type: "waterfall", name: "Cachoeira", details: "Fixture" }] as any} language="pt" onClose={onClose} />);
    completeQuestions(container);
    fireEvent.click(screen.getByRole("button", { name: "Solicitar via WhatsApp" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Seus dados foram mantidos"));
    expect(onClose).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("quote_requests");
    expect(from.mock.calls.every(([table]) => table === "quote_requests")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Solicitar via WhatsApp" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(window.open).toHaveBeenCalledOnce();
    expect(insert.mock.calls[1][0]).toEqual(insert.mock.calls[0][0]);
  });
});
