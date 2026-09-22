import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminAppearanceProvider } from "./admin-appearance";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetTitle } from "./sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "./alert-dialog";

afterEach(cleanup);

const surfaces = {
  dialog: <Dialog open><DialogContent data-testid="surface" aria-describedby={undefined}><DialogTitle>Formulário</DialogTitle></DialogContent></Dialog>,
  sheet: <Sheet open><SheetContent data-testid="surface" aria-describedby={undefined}><SheetTitle>Ficha</SheetTitle></SheetContent></Sheet>,
  popover: <Popover open><PopoverTrigger>Filtro</PopoverTrigger><PopoverContent data-testid="surface">Campos</PopoverContent></Popover>,
  select: <Select open><SelectTrigger><SelectValue /></SelectTrigger><SelectContent data-testid="surface"><SelectItem value="a">Opção A</SelectItem></SelectContent></Select>,
  alert: <AlertDialog open><AlertDialogContent data-testid="surface" aria-describedby={undefined}><AlertDialogTitle>Confirmação</AlertDialogTitle></AlertDialogContent></AlertDialog>,
};

describe("admin appearance boundary", () => {
  it.each(Object.entries(surfaces))("carries the admin scope into a portaled %s", (_, surface) => {
    const { container } = render(<AdminAppearanceProvider>{surface}</AdminAppearanceProvider>);
    expect(screen.getByTestId("surface")).toHaveClass("admin-ui");
    expect(container).not.toContainElement(screen.getByTestId("surface"));
  });

  it.each(Object.entries(surfaces))("does not restyle a public %s", (_, surface) => {
    render(surface);
    expect(screen.getByTestId("surface")).not.toHaveClass("admin-ui");
  });

  it("does not leave global appearance state after the admin is unmounted", () => {
    const { unmount } = render(<AdminAppearanceProvider>{surfaces.dialog}</AdminAppearanceProvider>);
    unmount();
    render(surfaces.dialog);
    expect(screen.getByTestId("surface")).not.toHaveClass("admin-ui");
    expect(document.body).not.toHaveClass("admin-ui");
    expect(document.documentElement).not.toHaveClass("admin-ui");
  });
});
