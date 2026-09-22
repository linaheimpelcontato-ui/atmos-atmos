import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import ProspectCombobox from "./ProspectCombobox";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(cleanup);
const prospects = [
  { id: "aaaaaaaa-first", name: "LOCAL fluxo integrado", email: "primeiro@example.invalid" },
  { id: "bbbbbbbb-second", name: "LOCAL fluxo integrado", email: "segundo@example.invalid" },
  { id: "cccccccc-third", name: "Outro cliente", phone: "62999990000" },
];
function mount() {
  const onChange = vi.fn();
  const onSubmit = vi.fn(event => event.preventDefault());
  function Form() {
    const [value, setValue] = useState<string | null>(null);
    return <form onSubmit={onSubmit}><ProspectCombobox prospects={prospects} value={value}
      onChange={id => { setValue(id); onChange(id); }} /></form>;
  }
  render(<Form />);
  fireEvent.click(screen.getByRole("combobox", { name: "Prospect" }));
  return { onChange, onSubmit };
}

describe("proposal prospect selection", () => {
  it("keeps namesakes distinct, highlights only one and selects the correct ID", async () => {
    const { onChange, onSubmit } = mount();
    const first = await screen.findByRole("option", { name: /primeiro@example/ });
    const second = screen.getByRole("option", { name: /segundo@example/ });
    expect(first).toHaveAttribute("data-value", prospects[0].id);
    expect(second).toHaveAttribute("data-value", prospects[1].id);
    fireEvent.pointerMove(second);
    await waitFor(() => expect(second).toHaveAttribute("aria-selected", "true"));
    expect(first).toHaveAttribute("aria-selected", "false");
    fireEvent.click(second);
    expect(onChange).toHaveBeenLastCalledWith(prospects[1].id);
    expect(screen.getByRole("combobox", { name: "Prospect" })).toHaveTextContent("segundo@example.invalid");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("combobox", { name: "Prospect" }));
    fireEvent.click(await screen.findByRole("option", { name: /primeiro@example/ }));
    expect(onChange).toHaveBeenLastCalledWith(prospects[0].id);
  });

  it("searches by contact as well as name and can remove the association", async () => {
    const { onChange } = mount();
    const input = screen.getByPlaceholderText("Buscar prospect...");
    fireEvent.change(input, { target: { value: "segundo@example.invalid" } });
    expect(await screen.findByRole("option", { name: /segundo@example/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /primeiro@example/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /segundo@example/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "Prospect" }));
    fireEvent.change(screen.getByPlaceholderText("Buscar prospect..."), { target: { value: "62999990000" } });
    fireEvent.click(await screen.findByRole("option", { name: "Outro cliente" }));
    expect(onChange).toHaveBeenLastCalledWith(prospects[2].id);
    fireEvent.click(screen.getByRole("combobox", { name: "Prospect" }));
    fireEvent.click(await screen.findByRole("option", { name: "Nenhum" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("distinguishes same-name records even when contact data is missing", async () => {
    render(<ProspectCombobox prospects={prospects.slice(0, 2).map(({ id, name }) => ({ id, name }))} value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Prospect" }));
    expect(await screen.findByRole("option", { name: /Cadastro aaaaaaaa/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Cadastro bbbbbbbb/ })).toBeInTheDocument();
  });
});
