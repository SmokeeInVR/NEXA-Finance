import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBusinessExpense, InsertMileageEntry, InsertBusinessIncomeLog, InsertBusinessSettings, BusinessIncomeLog, BusinessSettings } from "@shared/schema";

// === EXPENSES HOOKS ===
export function useBusinessExpenses() {
  return useQuery({
    queryKey: [api.business.expenses.list.path],
    queryFn: async () => {
      const res = await fetch(api.business.expenses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return api.business.expenses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBusinessExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBusinessExpense) => {
      const res = await fetch(api.business.expenses.create.path, {
        method: api.business.expenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create expense");
      return api.business.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.expenses.list.path] });
    },
  });
}

export function useDeleteBusinessExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.business.expenses.delete.path, { id });
      const res = await fetch(url, { 
        method: api.business.expenses.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete expense");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.expenses.list.path] });
    },
  });
}

// === MILEAGE HOOKS ===
export function useMileageEntries() {
  return useQuery({
    queryKey: [api.business.mileage.list.path],
    queryFn: async () => {
      const res = await fetch(api.business.mileage.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch mileage");
      return api.business.mileage.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMileageEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMileageEntry) => {
      const res = await fetch(api.business.mileage.create.path, {
        method: api.business.mileage.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create mileage entry");
      return api.business.mileage.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.mileage.list.path] });
    },
  });
}

export function useDeleteMileageEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.business.mileage.delete.path, { id });
      const res = await fetch(url, { 
        method: api.business.mileage.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete mileage entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.mileage.list.path] });
    },
  });
}

// === BUSINESS INCOME HOOKS ===
export function useBusinessIncome() {
  return useQuery<BusinessIncomeLog[]>({
    queryKey: [api.business.income.list.path],
    queryFn: async () => {
      const res = await fetch(api.business.income.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch business income");
      return res.json();
    },
  });
}

export function useCreateBusinessIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBusinessIncomeLog) => {
      const res = await fetch(api.business.income.create.path, {
        method: api.business.income.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create business income");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.income.list.path] });
    },
  });
}

export function useDeleteBusinessIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.business.income.delete.path, { id });
      const res = await fetch(url, { 
        method: api.business.income.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete business income");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.income.list.path] });
    },
  });
}

// === BUSINESS SETTINGS HOOKS ===
export function useBusinessSettings() {
  return useQuery<BusinessSettings>({
    queryKey: [api.business.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.business.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch business settings");
      return res.json();
    },
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBusinessSettings) => {
      const res = await fetch(api.business.settings.update.path, {
        method: api.business.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update business settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.business.settings.get.path] });
    },
  });
}
