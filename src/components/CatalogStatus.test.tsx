import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CatalogStatus } from "./CatalogStatus";
afterEach(cleanup);
it("distinguishes loading, failure and empty publication", () => {
  const refetch = vi.fn();
  const { rerender } = render(<CatalogStatus queries={[{ isPending: true, isError: false, refetch }]} />);
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  rerender(<CatalogStatus queries={[{ isPending: false, isError: true, refetch }]} />);
  expect(screen.getByRole("alert").textContent).toContain("Não foi possível");
  fireEvent.click(screen.getByRole("button"));
  expect(refetch).toHaveBeenCalledOnce();
  rerender(<CatalogStatus queries={[{ isPending: false, isError: false, data: [], refetch }]} />);
  expect(screen.getByRole("status").textContent).toContain("Nenhum produto");
});
