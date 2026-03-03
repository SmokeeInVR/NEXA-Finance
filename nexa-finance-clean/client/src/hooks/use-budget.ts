import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertBudgetSettings } from "@shared/routes";

export function useBudgetSettings() {
  return useQuery({
    queryKey: [api.budget.get.path],
    queryFn: async () => {
      const res = await fetch(api.budget.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch budget settings");
      return api.budget.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateBudgetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBudgetSettings) => {
      const res = await fetch(api.budget.update.path, {
        method: api.budget.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to update settings");
      }
      
      return api.budget.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budget.get.path] });
    },
  });
}
