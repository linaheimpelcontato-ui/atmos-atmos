import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TextEditPanel from "./TextEditPanel";

const leaves: HTMLElement[] = [];

function textLeaf() {
  const element = document.createElement("p");
  element.textContent = "Texto salvo desktop";
  element.dataset.editorOriginalText = "Texto fonte";
  element.style.cssText = "color: rgb(18, 52, 86); font-size: 24px; max-width: 400px; text-align: left; font-family: Georgia;";
  // jsdom does not implement rendered innerText or layout measurements.
  Object.defineProperty(element, "innerText", {
    configurable: true,
    get() { return element.textContent; },
    set(value: string) { element.textContent = value; },
  });
  Object.defineProperty(element, "offsetWidth", { value: 320 });
  document.body.appendChild(element);
  leaves.push(element);
  return element;
}

afterEach(() => {
  cleanup();
  leaves.splice(0).forEach(element => element.remove());
  document.getElementById("editor-pending-overrides")?.remove();
});

describe("TextEditPanel device ownership", () => {
  it("confirms text and pending CSS for desktop when the parent changes to mobile mid-edit", () => {
    const element = textLeaf();
    const originalStyles = element.style.cssText;
    const onOverride = vi.fn();
    const onClose = vi.fn();
    const view = render(<TextEditPanel element={element} onOverride={onOverride} onClose={onClose} initialDevice="desktop" />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Texto desktop editado" } });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "36" } });
    expect(element.innerText).toBe("Texto desktop editado");
    expect(element.style.fontSize).toBe("36px");
    expect(element).toHaveAttribute("data-editor-text-editing");

    view.rerender(<TextEditPanel element={element} onOverride={onOverride} onClose={onClose} initialDevice="mobile" />);
    expect(screen.getByText("Tamanho da fonte (Desktop)")).toBeInTheDocument();
    expect(screen.queryByText("Tamanho da fonte (Mobile)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    const selector = element.dataset.editorId!;
    const expectedStyles = { color: "#123456", maxWidth: "320px", textAlign: "left", fontSize: "36px" };
    expect(onOverride).toHaveBeenCalledExactlyOnceWith(selector, expectedStyles, "Texto desktop editado", "desktop", "Texto fonte");
    expect(onClose).toHaveBeenCalledOnce();
    const pending = document.getElementById("editor-pending-overrides")!;
    expect(JSON.parse(pending.dataset.pending!)).toEqual({ desktop: { [selector]: expectedStyles } });
    expect(pending.textContent).toContain("@media (min-width: 768px)");
    expect(pending.textContent).not.toContain("max-width: 767px");
    expect(pending.textContent).toContain("font-size: 36px !important");
    expect(element.style.cssText).toBe(originalStyles);
    expect(element.innerText).toBe("Texto desktop editado");
    expect(element).toHaveAttribute("data-editor-original-text", "Texto fonte");
    expect(element).toHaveAttribute("data-editor-text-pending");
    view.unmount();
    expect(element).not.toHaveAttribute("data-editor-text-editing");
    expect(element).toHaveAttribute("data-editor-text-pending");
  });

  it("cancels after a device change and restores the original text and inline styles", () => {
    const element = textLeaf();
    const originalStyles = element.style.cssText;
    const onOverride = vi.fn();
    const onClose = vi.fn();
    const view = render(<TextEditPanel element={element} onOverride={onOverride} onClose={onClose} initialDevice="desktop" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rascunho descartado" } });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "48" } });
    view.rerender(<TextEditPanel element={element} onOverride={onOverride} onClose={onClose} initialDevice="mobile" />);

    fireEvent.click(document.querySelector('[data-editor-ui].fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOverride).not.toHaveBeenCalled();
    expect(element.innerText).toBe("Texto salvo desktop");
    expect(element.style.cssText).toBe(originalStyles);
    expect(element).toHaveAttribute("data-editor-original-text", "Texto fonte");
    expect(element).not.toHaveAttribute("data-editor-text-pending");
    expect(document.getElementById("editor-pending-overrides")).toBeNull();
    view.unmount();
    expect(element).not.toHaveAttribute("data-editor-text-editing");
  });
});
