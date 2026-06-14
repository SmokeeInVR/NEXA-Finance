import { useQuery } from "@tanstack/react-query";
import type { BillsRegistryItem } from "@shared/schema";

export function useBillsRegistry() {
  return useQuery<BillsRegistryItem[]>({
    queryKey: ["bills-registry"],
    queryFn: async () => {
      const res = await fetch("/api/bills-registry", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bills registry");
      return res.json();
    },
  });
}
