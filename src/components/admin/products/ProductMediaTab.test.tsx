import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductMediaTab } from "./ProductMediaTab";
import { type Product } from "./shared";
import { r2 } from "@/lib/r2";
import { toast } from "sonner";

vi.mock("@/lib/r2", () => ({ r2: { list: vi.fn(), upload: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const product: Product = {
  id: "", name: "Produto ainda não salvo", type: "experience", segment: "b2c",
  description: null, unit_price: 0, cost_price: 0, currency: "BRL", is_active: false,
  created_at: "2026-09-22T12:00:00Z", source_id: null, source_type: null, category: null,
  variables: { storage_id: "local-gallery-test" },
};

beforeEach(() => {
  vi.mocked(r2.list).mockResolvedValue([]);
  vi.mocked(r2.upload).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function mount() {
  const view = render(<ProductMediaTab product={product} />);
  await screen.findByRole("button", { name: "Adicionar Fotos ou Vídeos" });
  return view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

describe("product media picker", () => {
  it("opens the same multiple image/video picker from both add controls", async () => {
    const input = await mount();
    const picker = vi.spyOn(input, "click").mockImplementation(() => {});
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", "image/*,video/*");
    fireEvent.click(screen.getByRole("button", { name: "ADICIONAR MÍDIA" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Fotos ou Vídeos" }));
    expect(picker).toHaveBeenCalledTimes(2);
    expect(r2.upload).not.toHaveBeenCalled();
  });

  it("sends the selected files to the draft's storage folder and refreshes the gallery", async () => {
    const input = await mount();
    const photo = new File(["synthetic image"], "foto.jpg", { type: "image/jpeg" });
    const video = new File(["synthetic video"], "video.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [photo, video] } });
    await waitFor(() => expect(r2.upload).toHaveBeenCalledTimes(2));
    expect(r2.upload).toHaveBeenNthCalledWith(1, "produtos/experiencias/local-gallery-test", "local-gallery-test-1.jpg", photo);
    expect(r2.upload).toHaveBeenNthCalledWith(2, "produtos/experiencias/local-gallery-test", "local-gallery-test-2.mp4", video);
    await waitFor(() => expect(r2.list).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith("2 arquivos enviados");
    expect(input.value).toBe("");
  });

  it("does not upload when the file picker is cancelled", async () => {
    const input = await mount();
    fireEvent.change(input, { target: { files: [] } });
    expect(r2.upload).not.toHaveBeenCalled();
  });

  it("shows an upload failure and permits another attempt", async () => {
    const input = await mount();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(r2.upload).mockRejectedValueOnce(new Error("Falha simulada"));
    const photo = new File(["synthetic image"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [photo] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erro no upload: Falha simulada"));
    expect(screen.getByRole("button", { name: "ADICIONAR MÍDIA" })).toBeEnabled();
    fireEvent.change(input, { target: { files: [photo] } });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 arquivos enviados"));
    expect(r2.upload).toHaveBeenCalledTimes(2);
  });
});
