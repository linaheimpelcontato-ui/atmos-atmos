import { afterEach, describe, expect, it, vi } from "vitest";
import { mountClicksignWidget } from "./clicksignWidget";

afterEach(() => { vi.unstubAllGlobals(); document.head.querySelectorAll('script[src*="clicksign"]').forEach(s => s.remove()); });

function setup() {
  const configure = vi.fn();
  vi.stubGlobal("Clicksign", { configure });
  const container = document.createElement("div");
  container.id = "clicksign-widget-container";
  const onSigned = vi.fn();
  let current = true;
  const dispose = mountClicksignWidget({ container, key: "fixture", signerName: "Fixture", isCurrent: () => current, onSigned });
  const script = document.head.querySelector('script[src*="clicksign"]') as HTMLScriptElement;
  return { configure, onSigned, dispose, script, invalidate: () => { current = false; } };
}

describe("Clicksign delayed callbacks", () => {
  it("does not configure an old widget after context changes", () => {
    const s = setup();
    s.invalidate();
    s.script.dispatchEvent(new Event("load"));
    expect(s.configure).not.toHaveBeenCalled();
    s.dispose();
  });
  it("accepts a current signature and ignores retained callbacks after navigation or cleanup", () => {
    const s = setup();
    s.script.dispatchEvent(new Event("load"));
    const onSigned = s.configure.mock.calls[0][0].onSigned;
    onSigned();
    expect(s.onSigned).toHaveBeenCalledTimes(1);
    s.invalidate();
    onSigned();
    s.dispose();
    onSigned();
    expect(s.onSigned).toHaveBeenCalledTimes(1);
  });
  it("invalidates even an already queued load callback on disposal", () => {
    const s = setup();
    const queued = s.script.onload!;
    s.dispose();
    queued.call(s.script, new Event("load"));
    expect(s.configure).not.toHaveBeenCalled();
    expect(s.script.isConnected).toBe(false);
  });
});
