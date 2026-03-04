import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertAccount, Account, AccountWithBalance } from "@shared/schema";

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: [api.accounts.list.path],
    queryFn: async () => {
      const res = await fetch(api.accounts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });
}

export function useAccountsWithBalances() {
  return useQuery<AccountWithBalance[]>({
    queryKey: [api.accounts.listWithBalances.path],
    queryFn: async () => {
      const res = await fetch(api.accounts.listWithBalances.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch accounts with balances");
      return res.json();
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAccount) => {
      const res = await fetch(api.accounts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.listWithBalances.path] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertAccount>) => {
      const url = buildUrl(api.accounts.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.listWithBalances.path] });
    },
  });
}

export function useSeedAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.accounts.seed.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to seed accounts");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.listWithBalances.path] });
    },
  });
}
