import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useUpdatePlaidAccountMetadata, type PlaidAccount } from "@/hooks/use-plaid";
import { getPlaidAccountTypeLabel, getPlaidDisplayName, getPlaidOwnerLabel, isPlaidCashAccount, isPlaidDebtAccount } from "@/lib/plaid-account-utils";
import { Building2, CreditCard, Landmark, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";

interface PlaidInstitution {
  itemId: string;
  institutionName: string;
  accounts: PlaidAccount[];
}

interface PlaidAccountsData {
  connected: boolean;
  institutions: PlaidInstitution[];
  totalBalance: number;
  lastUpdated: string;
}

const OWNER_OPTIONS = [
  { value: "none", label: "No owner tag" },
  { value: "me", label: "Mine" },
  { value: "spouse", label: "Wife" },
  { value: "joint", label: "Joint" },
  { value: "business", label: "Business" },
  { value: "household", label: "Household" },
] as const;

const fmt = (n: number | null | undefined) =>
  n == null
    ? "N/A"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function accountIcon(account: PlaidAccount) {
  if (isPlaidDebtAccount(account)) return <CreditCard className="w-4 h-4 text-soft-red" />;
  return <Landmark className="w-4 h-4 text-emerald-400" />;
}

export function PlaidBankConnect() {
  const qc = useQueryClient();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { customName: string; ownerTag: string; ledgerAccountId: string }>>({});

  const { data, isLoading } = useQuery<PlaidAccountsData>({
    queryKey: ["/api/plaid/accounts"],
    refetchInterval: 60_000,
  });
  const { data: ledgerAccounts } = useAccountsWithBalances();
  const updateMetadata = useUpdatePlaidAccountMetadata();

  const fetchLinkToken = useCallback(async () => {
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      const json = await res.json();
      if (json.link_token) {
        setLinkToken(json.link_token);
        return json.link_token as string;
      }
      setTokenError("Could not get link token");
      return null;
    } catch (e) {
      console.error("Link token error:", e);
      setTokenError("Failed to prepare bank connection");
      return null;
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLinkToken();
  }, [fetchLinkToken]);

  useEffect(() => {
    const nextDrafts: Record<string, { customName: string; ownerTag: string; ledgerAccountId: string }> = {};
    data?.institutions.forEach((institution) => {
      institution.accounts.forEach((account) => {
        const key = `${institution.itemId}:${account.accountId}`;
        nextDrafts[key] = {
          customName: account.customName || "",
          ownerTag: account.ownerTag || "none",
          ledgerAccountId: account.ledgerAccountId?.toString() || "none",
        };
      });
    });
    setDrafts(nextDrafts);
  }, [data]);

  const exchangeMutation = useMutation({
    mutationFn: async ({ public_token, institution }: { public_token: string; institution: string }) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", {
        public_token,
        institution_name: institution,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
      setLinkToken(null);
      setTokenLoading(true);
      apiRequest("POST", "/api/plaid/create-link-token")
        .then((r) => r.json())
        .then((j) => {
          if (j.link_token) setLinkToken(j.link_token);
        })
        .finally(() => setTokenLoading(false));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/sync");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/plaid/balance-summary"] });
      qc.invalidateQueries({ queryKey: ["/api/plaid/transactions"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/plaid/disconnect/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/plaid/balance-summary"] });
      qc.invalidateQueries({ queryKey: ["/api/plaid/transactions"] });
    },
  });

  const onSuccess = useCallback(
    (public_token: string, metadata: any) => {
      const institution = metadata?.institution?.name || "My Bank";
      exchangeMutation.mutate({ public_token, institution });
    },
    [exchangeMutation],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  useEffect(() => {
    if (shouldOpen && ready) {
      setShouldOpen(false);
      open();
    }
  }, [shouldOpen, ready, open]);

  const handleConnect = async () => {
    if (!linkToken) {
      const token = await fetchLinkToken();
      if (token) setShouldOpen(true);
      return;
    }
    if (ready) {
      open();
    } else {
      setShouldOpen(true);
    }
  };

  const isConnected = data?.connected && (data?.institutions?.length ?? 0) > 0;
  const btnDisabled = tokenLoading || exchangeMutation.isPending;
  const btnLabel = tokenLoading
    ? "Preparing..."
    : tokenError
      ? "Reconnect bank"
      : !linkToken
        ? "Loading..."
        : "Connect bank";

  const connectedAccounts = useMemo(
    () =>
      (data?.institutions || []).flatMap((institution) =>
        institution.accounts.map((account) => ({
          ...account,
          itemId: institution.itemId,
          institutionName: institution.institutionName,
        })),
      ),
    [data],
  );

  const cashAccounts = connectedAccounts.filter((account) => isPlaidCashAccount(account));
  const debtAccounts = connectedAccounts.filter((account) => isPlaidDebtAccount(account));
  const ledgerAccountOptions = useMemo(
    () => (ledgerAccounts || []).filter((account) => !account.excludeFromTotals),
    [ledgerAccounts],
  );
  const ledgerAccountsById = useMemo(
    () => new Map(ledgerAccountOptions.map((account) => [account.id, account])),
    [ledgerAccountOptions],
  );

  const saveMetadata = (itemId: string, accountId: string) => {
    const key = `${itemId}:${accountId}`;
    const draft = drafts[key] || { customName: "", ownerTag: "none", ledgerAccountId: "none" };
    updateMetadata.mutate({
      itemId,
      accountId,
      customName: draft.customName || null,
      ownerTag: draft.ownerTag === "none" ? null : draft.ownerTag,
      ledgerAccountId:
        draft.ledgerAccountId === "none" ? null : Number(draft.ledgerAccountId),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/70 p-4 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Linked account manager</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Give each linked account a human name and owner so the rest of the app can read like your real household instead of raw Plaid exports. Credit cards and loans are treated as debts on purpose.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {isConnected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-gray-400" />}
          <span className="text-sm font-medium text-gray-300">
            {isConnected ? `${data!.institutions.length} bank${data!.institutions.length > 1 ? "s" : ""} connected` : "No banks connected"}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-1 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sync
            </Button>
          )}
          <Button size="sm" onClick={handleConnect} disabled={btnDisabled} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
            <Building2 className="w-3 h-3" />
            {btnLabel}
          </Button>
        </div>
      </div>

      {tokenError && <p className="text-xs text-red-400 text-center">{tokenError}</p>}

      {isLoading && <div className="text-center py-8 text-gray-400 text-sm">Loading accounts...</div>}

      {!isLoading && !isConnected && (
        <Card className="border-dashed border-gray-700 bg-gray-900/40">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Building2 className="w-10 h-10 text-gray-600" />
            <p className="text-gray-400 text-sm text-center">Connect your bank account to see real balances and transactions</p>
            <Button onClick={handleConnect} disabled={btnDisabled} className="mt-2 bg-emerald-600 hover:bg-emerald-700">
              {btnLabel}
            </Button>
          </CardContent>
        </Card>
      )}

      {isConnected && (
        <>
          <Card className="bg-gray-900/60 border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-100">Cash accounts</CardTitle>
              <CardDescription>Checking and savings that should drive the household cash view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cashAccounts.map((account) => {
                const key = `${account.itemId}:${account.accountId}`;
                const draft = drafts[key] || {
                  customName: account.customName || "",
                  ownerTag: account.ownerTag || "none",
                  ledgerAccountId: account.ledgerAccountId?.toString() || "none",
                };

                return (
                  <div key={key} className="rounded-xl border border-gray-700 bg-black/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex items-start gap-2">
                        {accountIcon(account)}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-100 truncate">{getPlaidDisplayName(account)}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {account.institutionName} {account.mask ? `....${account.mask}` : ""} · {getPlaidAccountTypeLabel(account)}
                          </p>
                          {getPlaidOwnerLabel(account.ownerTag) && (
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gold mt-1">{getPlaidOwnerLabel(account.ownerTag)}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-300">{fmt(account.balance)}</p>
                        {account.availableBalance != null && account.availableBalance !== account.balance && (
                          <p className="text-xs text-gray-500">{fmt(account.availableBalance)} avail</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
                      <Input
                        value={draft.customName}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [key]: { ...draft, customName: event.target.value },
                          }))
                        }
                        placeholder="Friendly name, e.g. Marcel checking"
                      />
                      <Select
                        value={draft.ownerTag || "none"}
                        onValueChange={(value) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [key]: { ...draft, ownerTag: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {OWNER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      <Select
                        value={draft.ledgerAccountId || "none"}
                        onValueChange={(value) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [key]: { ...draft, ledgerAccountId: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ledger account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No ledger mapping</SelectItem>
                          {ledgerAccountOptions.map((ledgerAccount) => (
                            <SelectItem key={ledgerAccount.id} value={ledgerAccount.id.toString()}>
                              {ledgerAccount.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => saveMetadata(account.itemId!, account.accountId)}
                        disabled={updateMetadata.isPending}
                      >
                        Save
                      </Button>
                    </div>
                    {draft.ledgerAccountId !== "none" && ledgerAccountsById.has(Number(draft.ledgerAccountId)) && (
                      <p className="text-[11px] text-muted-foreground">
                        Mapped to <span className="text-foreground font-medium">{ledgerAccountsById.get(Number(draft.ledgerAccountId))?.name}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {debtAccounts.length > 0 && (
            <Card className="bg-gray-900/60 border-gray-700">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-100">Linked debt accounts</CardTitle>
                <CardDescription>Credit cards and loans are separated here so they do not muddy the cash picture.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
              {debtAccounts.map((account) => {
                  const key = `${account.itemId}:${account.accountId}`;
                  const draft = drafts[key] || {
                    customName: account.customName || "",
                    ownerTag: account.ownerTag || "none",
                    ledgerAccountId: account.ledgerAccountId?.toString() || "none",
                  };

                  return (
                    <div key={key} className="rounded-xl border border-soft-red/30 bg-soft-red/10 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex items-start gap-2">
                          {accountIcon(account)}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-100 truncate">{getPlaidDisplayName(account)}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {account.institutionName} {account.mask ? `....${account.mask}` : ""} · {getPlaidAccountTypeLabel(account)}
                            </p>
                            {getPlaidOwnerLabel(account.ownerTag) && (
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gold mt-1">{getPlaidOwnerLabel(account.ownerTag)}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-soft-red">{fmt(account.balance)}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                        <Input
                          value={draft.customName}
                          onChange={(event) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [key]: { ...draft, customName: event.target.value },
                            }))
                          }
                          placeholder="Friendly name, e.g. Capital One card"
                        />
                        <Select
                          value={draft.ownerTag || "none"}
                          onValueChange={(value) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [key]: { ...draft, ownerTag: value },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {OWNER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => saveMetadata(account.itemId!, account.accountId)}
                          disabled={updateMetadata.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isConnected && data!.institutions.map((institution) => (
        <Card key={institution.itemId} className="bg-gray-900/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                {institution.institutionName}
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-gray-500 hover:text-red-400"
                onClick={() => disconnectMutation.mutate(institution.itemId)}
                disabled={disconnectMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {institution.accounts.map((account, index) => (
              <div key={account.accountId}>
                {index > 0 && <Separator className="bg-gray-800 my-2" />}
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0 flex items-center gap-2">
                    {accountIcon(account)}
                    <div className="min-w-0">
                      <p className="text-gray-200 truncate">{getPlaidDisplayName(account)}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {getPlaidAccountTypeLabel(account)} {account.mask ? `....${account.mask}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-100">{fmt(account.balance)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
