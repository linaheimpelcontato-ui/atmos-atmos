import { useQuery } from "@tanstack/react-query";
import { fetchPublicProducts } from "@/lib/publicProducts";

export function useProducts(type?: string) {
  return useQuery({
    queryKey: ["public-products", type],
    queryFn: () => fetchPublicProducts(type),
  });
}
