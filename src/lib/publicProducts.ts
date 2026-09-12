import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const publicProductSchema = z.object({
  id: z.string(), source_id: z.string().nullable(), name: z.string(), type: z.string(),
  category: z.string().nullable(), segment: z.string(), description: z.string().nullable(),
  unit_price: z.number(), currency: z.string(), is_active: z.literal(true),
  updated_at: z.string(), variables: z.record(z.unknown()),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;

export async function fetchPublicProducts(type?: string): Promise<PublicProduct[]> {
  const { data, error } = await supabase.rpc("get_public_products", { p_type: type ?? null });
  if (error) throw error;
  // Invalid/missing projection fails closed; never query internal rows as a fallback.
  return z.array(publicProductSchema).parse(data);
}
