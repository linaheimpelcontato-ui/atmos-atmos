import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import VideoFeature from "./VideoFeature";

beforeEach(() => { vi.stubGlobal("IntersectionObserver", class {
  observe() {} unobserve() {} disconnect() {}
}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("keeps playback available when pause aborts an in-flight play", async () => {
  let rejectPlay: (reason: unknown) => void;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => new Promise((_, reject) => { rejectPlay = reject; }));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  render(<VideoFeature />);
  fireEvent.click(screen.getByRole("button", { name: "Assistir ao filme" }));
  fireEvent.click(screen.getByRole("button", { name: "Pausar filme" }));
  await act(async () => { rejectPlay(new DOMException("Interrupted by pause", "AbortError")); });
  expect(screen.getByRole("button", { name: "Assistir ao filme" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).toBeNull();
});
