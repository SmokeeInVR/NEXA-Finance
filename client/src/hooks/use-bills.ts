import { useQuery } from "@tanstack/react-query";

export function useBillsRegistry() {
  return useQuery<any[]>({
    queryKey: ["/api/finance/obligations"],
    queryFn: async () => {
      const res = await fetch("/api/finance/obligations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch canonical obligations");

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Canonical obligations endpoint returned unexpected content");
      }

      return res.json();
    },
  });
}
