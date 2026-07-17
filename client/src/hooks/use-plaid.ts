import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PlaidAccount {
  accountId: string;
  itemId?: string;
  name: string;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balance?: number | null;
  availableBalance?: number | null;
  isoCurrencyCode?: string | null;
  customName?: string | null;
  ownerTag?: string | null;
  ledgerAccountId?: number | null;
  displayName?: string | null;
  classification?: "cash" | "debt" | "investment" | "other";
  debtKind?: "credit_card" | "auto_loan" | "loan" | null;
}

export interface PlaidInstitution {
  itemId: string;
  institutionName: string;
  accounts: PlaidAccount[];
}

export interface PlaidAccountsData {
  connected: boolean;
  institutions: PlaidInstitution[];
  totalBalance?: number;
  lastUpdated?: string;
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  date: string;
  name: string;
  amount: number;
  category?: string | null;
  subcategory?: string | null;
  merchantName?: string | null;
  institutionName: string;
  pending: boolean;
  accountName?: string | null;
  accountDisplayName?: string | null;
  accountOwnerTag?: string | null;
  accountClassification?: "cash" | "debt" | "investment" | "other";
}

export interface PlaidTransactionsData {
  connected: boolean;
  transactions: PlaidTransaction[];
  count: number;
  startDate: string;
  endDate: string;
}

export interface PlaidBalanceSummaryAccount extends PlaidAccount {
  institutionName: string;
}

export interface PlaidBalanceSummaryData {
  connected: boolean;
  totalCash: number;
  totalChecking: number;
  totalSavings: number;
  totalCreditOwed: number;
  accounts: PlaidBalanceSummaryAccount[];
  lastUpdated?: string;
}

async function fetchJsonOrThrow(path: string, message: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(message);

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`${path} returned unexpected content`);
  }

  return res.json();
}

export function usePlaidAccounts() {
  return useQuery<PlaidAccountsData>({
    queryKey: ["/api/plaid/accounts"],
    queryFn: () => fetchJsonOrThrow("/api/plaid/accounts", "Failed to fetch connected bank accounts"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function usePlaidTransactions(days = 30) {
  return useQuery<PlaidTransactionsData>({
    queryKey: ["/api/plaid/transactions", days],
    queryFn: () =>
      fetchJsonOrThrow(
        `/api/plaid/transactions?days=${days}`,
        "Failed to fetch connected bank transactions",
      ),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function usePlaidBalanceSummary() {
  return useQuery<PlaidBalanceSummaryData>({
    queryKey: ["/api/plaid/balance-summary"],
    queryFn: () =>
      fetchJsonOrThrow(
        "/api/plaid/balance-summary",
        "Failed to fetch connected bank balance summary",
      ),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePlaidAccountMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
    itemId,
    accountId,
    customName,
    ownerTag,
    ledgerAccountId,
  }: {
    itemId: string;
    accountId: string;
    customName?: string | null;
    ownerTag?: string | null;
    ledgerAccountId?: number | null;
  }) => {
      const res = await fetch(`/api/plaid/accounts/${itemId}/${accountId}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customName, ownerTag, ledgerAccountId }),
      });

      if (!res.ok) {
        throw new Error("Failed to update linked account details");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/balance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/status"] });
    },
  });
}
