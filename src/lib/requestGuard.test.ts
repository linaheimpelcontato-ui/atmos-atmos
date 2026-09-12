import { describe, it, expect } from "vitest";
import { createLatestRequestGuard } from "./requestGuard";

describe("createLatestRequestGuard", () => {
  it("keeps a single in-flight request current", () => {
    const guard = createLatestRequestGuard();
    const request = guard.start();
    expect(request.isCurrent()).toBe(true);
  });

  it("out-of-order resolution: an older request resolving after a newer one is discarded regardless of arrival order", () => {
    const guard = createLatestRequestGuard();
    const first = guard.start();
    const second = guard.start();
    const third = guard.start();

    // Simulate arrival order 2, 1, 3 (typical of real network races).
    expect(second.isCurrent()).toBe(false);
    expect(first.isCurrent()).toBe(false);
    expect(third.isCurrent()).toBe(true);
  });

  it("admin→logout: a request started under one identity is stale once a new one starts, even if it resolves later", () => {
    const guard = createLatestRequestGuard();
    const adminRequest = guard.start(); // in flight as admin
    const anonRequest = guard.start(); // logout happens, new request for the same token starts

    expect(anonRequest.isCurrent()).toBe(true);
    expect(adminRequest.isCurrent()).toBe(false);
  });

  it("A -> B -> A: a stale response sharing the same logical key as the newest request does not become current again", () => {
    // The bug a key-comparison-based guard would have: if "current" were
    // decided by comparing keys instead of generations, the request for A
    // fired the first time and the request for A fired the third time
    // would look identical, so the FIRST (already-superseded) one would
    // wrongly count as current again once the third one starts.
    const guard = createLatestRequestGuard();
    const firstA = guard.start();
    const b = guard.start();
    const secondA = guard.start();

    expect(secondA.isCurrent()).toBe(true);
    expect(firstA.isCurrent()).toBe(false); // must stay stale
    expect(b.isCurrent()).toBe(false);
  });

  it("two requests started back to back for what would be the same key are still independent", () => {
    const guard = createLatestRequestGuard();
    const requestOne = guard.start();
    const requestTwo = guard.start();
    expect(requestOne.isCurrent()).toBe(false);
    expect(requestTwo.isCurrent()).toBe(true);
  });

  it("invalidate() (effect cleanup / unmount) marks the request stale even with nothing newer started", () => {
    const guard = createLatestRequestGuard();
    const request = guard.start();
    expect(request.isCurrent()).toBe(true);
    request.invalidate(); // e.g. component unmounted before the response arrived
    expect(request.isCurrent()).toBe(false);
  });

  it("invalidate() on an already-superseded request is a no-op (does not resurrect it or affect the newer one)", () => {
    const guard = createLatestRequestGuard();
    const stale = guard.start();
    const current = guard.start();
    stale.invalidate();
    expect(stale.isCurrent()).toBe(false);
    expect(current.isCurrent()).toBe(true);
  });

  it("snapshot() lets a click-triggered write action (not a fetch) verify the page hasn't navigated on since it began", () => {
    const guard = createLatestRequestGuard();
    guard.start(); // page load fetch for proposal A
    const writeContext = guard.start(); // treat the load itself as "current context" for this example...
    expect(writeContext.isCurrent()).toBe(true);

    const atClickTime = guard.snapshot(); // e.g. togglePublish captures this when clicked
    expect(atClickTime.isCurrent()).toBe(true);

    guard.start(); // user navigates to a different proposal before the write resolves
    expect(atClickTime.isCurrent()).toBe(false); // write's result must not touch the new page's state
  });
});
