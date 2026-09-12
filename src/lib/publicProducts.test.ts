import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from } }));
import { fetchPublicProducts } from "./publicProducts";

describe("public catalog boundary", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses the public RPC and keeps a legitimate empty catalog empty", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await fetchPublicProducts("waterfall")).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("get_public_products", { p_type: "waterfall" });
    expect(from).not.toHaveBeenCalled();
  });
  it("fails closed when migration is missing", async () => {
    const error = { code: "PGRST202" };
    rpc.mockResolvedValue({ data: null, error });
    await expect(fetchPublicProducts()).rejects.toEqual(error);
    expect(from).not.toHaveBeenCalled();
  });
  it.each([null, {}, [{ id: "inactive", is_active: false }]])("rejects invalid catalog payload %j", async data => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(fetchPublicProducts()).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});
