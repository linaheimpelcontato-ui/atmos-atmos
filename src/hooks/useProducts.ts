import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/components/admin/products/shared";

export function useProducts(type?: string) {
  return useQuery({
    queryKey: ["products", type],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (type) {
        query = query.eq("type", type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}
