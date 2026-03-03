import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertDebt } from "@shared/schema";

export function useDebts() {
  return useQuery({
    queryKey: [api.debts.list.path],
    queryFn: async () => {
      const res = await fetch(api.debts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch debts");
      return api.debts.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDebt) => {
      const res = await fetch(api.debts.create.path, {
        method: api.debts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) throw new Error("Validation failed");
        throw new Error("Failed to create debt");
      }
      return api.debts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.debts.list.path] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, balance }: { id: number; balance: string }) => {
      const url = buildUrl(api.debts.update.path, { id });
      const res = await fetch(url, {
        method: api.debts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update debt");
      return api.debts.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.debts.list.path] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.debts.delete.path, { id });
      const res = await fetch(url, {
        method: api.debts.delete.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete debt");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.debts.list.path] });
    },
  });
}
