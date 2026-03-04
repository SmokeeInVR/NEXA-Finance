import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertTransaction, Transaction } from "@shared/schema";

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  accountId?: number;
}

export function useTransactions(filters?: TransactionFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.startDate) queryParams.set("startDate", filters.startDate);
  if (filters?.endDate) queryParams.set("endDate", filters.endDate);
  if (filters?.type) queryParams.set("type", filters.type);
  if (filters?.accountId) queryParams.set("accountId", String(filters.accountId));
  
  const queryString = queryParams.toString();
  const url = queryString ? `${api.transactions.list.path}?${queryString}` : api.transactions.list.path;
  
  return useQuery<Transaction[]>({
    queryKey: [api.transactions.list.path, filters],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await fetch(api.transactions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create transaction");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.listWithBalances.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/debts/with-payments"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete transaction");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.listWithBalances.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/debts/with-payments"] });
    },
  });
}
