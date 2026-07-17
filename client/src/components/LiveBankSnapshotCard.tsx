import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { usePlaidAccounts } from "@/hooks/use-plaid";
import {
  getPlaidAccountTypeLabel,
  getPlaidDisplayName,
  getPlaidOwnerLabel,
  isPlaidCashAccount,
  isPlaidDebtAccount,
} from "@/lib/plaid-account-utils";
import { Building2, Landmark, Loader2, RefreshCw, Wallet } from "lucide-react";

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedMoney(amount: number) {
  return `${amount >= 0 ? "+" : "-"}$${formatMoney(Math.abs(amount))}`;
}

export function LiveBankSnapshotCard() {
  const { data, isLoading, error } = usePlaidAccounts();
  const { data: ledgerAccounts } = useAccountsWithBalances();

  const ledgerAccountById = useMemo(
    () => new Map((ledgerAccounts || []).map((account) => [account.id, account])),
    [ledgerAccounts],
  );

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Landmark className="w-5 h-5" /> Live Bank Snapshot
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Loading connected accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-36">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error instanceof Error) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Landmark className="w-5 h-5" /> Live Bank Snapshot
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Plaid-connected truth layer
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-soft-red font-medium">Unable to load connected bank balances.</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.connected || data.institutions.length === 0) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Landmark className="w-5 h-5" /> Live Bank Snapshot
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Plaid-connected truth layer
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            No connected bank accounts yet. Use the Accounts page to finish Plaid linking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const accounts = data.institutions.flatMap((institution) =>
    institution.accounts.map((account) => ({
      ...account,
      itemId: institution.itemId,
      institutionName: institution.institutionName,
    })),
  );

  const cashAccounts = accounts.filter((account) => isPlaidCashAccount(account));
  const debtAccounts = accounts.filter((account) => isPlaidDebtAccount(account));
  const checkingAccounts = cashAccounts.filter((account) => account.subtype !== "savings");
  const savingsAccounts = cashAccounts.filter((account) => account.subtype === "savings");
  const totalCash = cashAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const totalAvailable = cashAccounts.reduce(
    (sum, account) => sum + (account.availableBalance ?? account.balance ?? 0),
    0,
  );
  const totalDebt = debtAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const mappedCashAccounts = cashAccounts.filter((account) => account.ledgerAccountId != null);
  const unmappedCashAccounts = cashAccounts.filter((account) => account.ledgerAccountId == null);
  const mappedVarianceTotal = mappedCashAccounts.reduce((sum, account) => {
    const ledgerAccount = ledgerAccountById.get(Number(account.ledgerAccountId));
    const ledgerBalance = ledgerAccount?.currentBalance ?? 0;
    return sum + ((account.balance ?? 0) - ledgerBalance);
  }, 0);
  const visibleCashAccounts = [...cashAccounts].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 6);
  const visibleDebtAccounts = [...debtAccounts].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 6);

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <Landmark className="w-5 h-5" /> Live Bank Snapshot
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          Actual balances from connected bank accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-success">Total cash</p>
            <p className="mt-1 text-2xl font-bold font-mono text-success">${formatMoney(totalCash)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available now</p>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">${formatMoney(totalAvailable)}</p>
          </div>
          <div className="rounded-lg border border-soft-red/30 bg-soft-red/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-soft-red">Linked debt</p>
            <p className="mt-1 text-xl font-bold font-mono text-soft-red">${formatMoney(totalDebt)}</p>
            <p className="text-[10px] text-muted-foreground">{debtAccounts.length} credit or loan accounts</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accounts linked</p>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">{accounts.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {checkingAccounts.length} checking, {savingsAccounts.length} savings
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-success">Mapped cash accounts</p>
            <p className="mt-1 text-2xl font-bold font-mono text-success">{mappedCashAccounts.length}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unmapped cash accounts</p>
            <p className="mt-1 text-2xl font-bold font-mono text-foreground">{unmappedCashAccounts.length}</p>
          </div>
          <div
            className={`rounded-lg border p-3 ${Math.abs(mappedVarianceTotal) < 0.01 ? "border-success/30 bg-success/10" : "border-soft-red/30 bg-soft-red/10"}`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-wider ${Math.abs(mappedVarianceTotal) < 0.01 ? "text-success" : "text-soft-red"}`}
            >
              Net mapped variance
            </p>
            <p
              className={`mt-1 text-2xl font-bold font-mono ${Math.abs(mappedVarianceTotal) < 0.01 ? "text-success" : "text-soft-red"}`}
            >
              {formatSignedMoney(mappedVarianceTotal)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Connected cash accounts</p>
            {data.lastUpdated && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {new Date(data.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {visibleCashAccounts.map((account) => {
              const ledgerAccount = account.ledgerAccountId != null ? ledgerAccountById.get(Number(account.ledgerAccountId)) : null;
              const ledgerBalance = ledgerAccount?.currentBalance ?? 0;
              const variance = ledgerAccount ? (account.balance ?? 0) - ledgerBalance : null;
              const varianceIsClose = variance != null && Math.abs(variance) < 0.01;

              return (
                <div key={account.accountId} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getPlaidDisplayName(account)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {account.institutionName}
                        {account.mask ? ` •••• ${account.mask}` : ""}
                      </p>
                      {account.customName && account.customName !== account.name && (
                        <p className="text-[10px] text-muted-foreground">Bank label: {account.name}</p>
                      )}
                    </div>
                    <Building2 className="w-4 h-4 text-gold shrink-0" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</p>
                      <p className="text-lg font-bold font-mono text-foreground">${formatMoney(account.balance ?? 0)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{getPlaidAccountTypeLabel(account)}</p>
                      {getPlaidOwnerLabel(account.ownerTag) && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gold">{getPlaidOwnerLabel(account.ownerTag)}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-border/50 bg-background/40 p-2">
                    {ledgerAccount ? (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mapped ledger account</p>
                        <p className="text-sm font-medium text-foreground truncate">{ledgerAccount.name}</p>
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-muted-foreground">Ledger ${formatMoney(ledgerBalance)}</span>
                          <span className={varianceIsClose ? "font-medium text-success" : "font-medium text-soft-red"}>
                            {variance != null ? formatSignedMoney(variance) : "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Unmapped. Pick a ledger account in Bank Connect to compare balances.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {visibleDebtAccounts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked debt accounts</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {visibleDebtAccounts.map((account) => (
                <div key={account.accountId} className="rounded-lg border border-soft-red/30 bg-soft-red/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getPlaidDisplayName(account)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {account.institutionName}
                        {account.mask ? ` •••• ${account.mask}` : ""}
                      </p>
                    </div>
                    <Wallet className="w-4 h-4 text-soft-red shrink-0" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-bold font-mono text-soft-red">${formatMoney(account.balance ?? 0)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{getPlaidAccountTypeLabel(account)}</p>
                      {getPlaidOwnerLabel(account.ownerTag) && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gold">{getPlaidOwnerLabel(account.ownerTag)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">
            This card is the live bank truth layer. Cash stays separate from debt, and mapped ledger targets let you compare the bank against the internal ledger instead of reading raw Plaid exports.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
