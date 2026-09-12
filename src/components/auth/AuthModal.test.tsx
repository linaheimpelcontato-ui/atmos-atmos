import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthModal from "./AuthModal";

const signOut = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "existing-user" }, profile: null, signOut }),
}));
function Harness() {
  const [open, setOpen] = useState(true);
  return <AuthModal open={open} onClose={() => setOpen(false)} onSuccess={() => {}} defaultMode="login" />;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("authentication modal dismissal", () => {
  it("closes with its accessible button without signing out an existing user", () => {
    render(<Harness />);
    expect(screen.getByRole("dialog", { name: "Entrar na Atmos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar acesso" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });
  it("closes with Escape and removes the fullscreen dialog", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
