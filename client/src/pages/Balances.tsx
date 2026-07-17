import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Layout } from "@/components/Layout";
import { LiveBankSnapshotCard } from "@/components/LiveBankSnapshotCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccountsWithBalances, useUpdateAccount } from "@/hooks/use-accounts";
import { Loader2, Plus, Save, Clock, Wallet, Briefcase, PiggyBank, Landmark } from "lucide-react";
import type { AccountWithBalance } from "@shared/schema";

const EDITABLE_ACCOUNT_TYPES = ["personal", "spouse", "joint", "bucket", "business"] as const;

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function AccountSection({
  title,
  description,
  icon,
  toneClass,
  accounts,
  editedBalances,
  setEditedBalances,
  updateAccount,
  toast,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  toneClass: string;
  accounts: AccountWithBalance[];
  editedBalances: Record<number, string>;
  setEditedBalances: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  updateAccount: ReturnType<typeof useUpdateAccount>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const persistBalance = async (account: AccountWithBalance, desiredBalance: string) => {
    const parsed = parseFloat(desiredBalance);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid balance for ${account.name}`);
    }

    const startingBalance = parseFloat(account.startingBalance || "0");
    const transactionDelta = account.currentBalance - startingBalance;
    const newStartingBalance = parsed - transactionDelta;

    await updateAccount.mutateAsync({
      id: account.id,
      startingBalance: newStartingBalance.toFixed(2),
    });
  };

  return (
    <Card className="border-border bg-card shadow-lg">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          {icon} {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts in this group yet.</p>
        ) : (
          accounts.map((account) => {
            const editedValue = editedBalances[account.id] ?? account.currentBalance.toFixed(2);
            return (
              <div key={account.id} className="rounded-xl border border-border/60 bg-muted/15 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{account.type}</p>
                    {account.updatedAt && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Updated {formatDistanceToNow(new Date(account.updatedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gold text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-10 w-32 border-border bg-background text-right font-mono font-bold"
                      value={editedValue}
                      onChange={(event) =>
                        setEditedBalances((previous) => ({
                          ...previous,
                          [account.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      className="h-10"
                      disabled={updateAccount.isPending}
                      onClick={async () => {
                        try {
                          await persistBalance(account, editedValue);
                          setEditedBalances((previous) => {
                            const next = { ...previous };
                            delete next[account.id];
                            return next;
                          });
                          toast({ title: `${account.name} updated` });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to update balance",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function Balances() {
  const { toast } = useToast();
  const { data: accounts, isLoading } = useAccountsWithBalances();
  const updateAccount = useUpdateAccount();
  const [editedBalances, setEditedBalances] = useState<Record<number, string>>({});
  const [selectedQuickAddId, setSelectedQuickAddId] = useState<number | null>(null);

  const visibleAccounts = useMemo(
    () =>
      (accounts || []).filter(
        (account) =>
          EDITABLE_ACCOUNT_TYPES.includes(account.type as (typeof EDITABLE_ACCOUNT_TYPES)[number]) &&
          !account.excludeFromTotals,
      ),
    [accounts],
  );

  const householdAccounts = visibleAccounts.filter((account) => ["personal", "spouse", "joint"].includes(account.type));
  const businessAccounts = visibleAccounts.filter((account) => account.type === "business");
  const bucketAccounts = visibleAccounts.filter((account) => account.type === "bucket");
  const selectedQuickAddAccount = visibleAccounts.find((account) => account.id === selectedQuickAddId) ?? null;

  const householdTotal = householdAccounts.reduce(
    (sum, account) => sum + parseFloat(editedBalances[account.id] ?? account.currentBalance.toFixed(2)),
    0,
  );
  const businessTotal = businessAccounts.reduce(
    (sum, account) => sum + parseFloat(editedBalances[account.id] ?? account.currentBalance.toFixed(2)),
    0,
  );
  const bucketTotal = bucketAccounts.reduce(
    (sum, account) => sum + parseFloat(editedBalances[account.id] ?? account.currentBalance.toFixed(2)),
    0,
  );

  if (isLoading) {
    return (
      <Layout title="Banking">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Banking">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Banking workspace</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This page now works like a clean banking truth layer: live connected accounts first, ledger baselines second. Use manual edits only when you are correcting the ledger to match the bank, not inventing balances from scratch.
          </p>
        </div>

        <LiveBankSnapshotCard />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Household ledger</p>
              <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(householdTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business ledger</p>
              <p className="mt-2 text-2xl font-bold font-mono text-gold">${formatMoney(businessTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Buckets and reserves</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(bucketTotal)}</p>
            </CardContent>
          </Card>
        </div>

        <details className="group rounded-2xl border border-border bg-card/70 shadow-lg" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            <span>Ledger baseline controls</span>
            <span className="text-gold group-open:hidden">Show</span>
            <span className="hidden text-gold group-open:inline">Hide</span>
          </summary>
          <div className="space-y-6 px-4 pb-4">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <AccountSection
                  title="Household accounts"
                  description="Joint, personal, and spouse ledger balances"
                  icon={<Wallet className="w-5 h-5" />}
                  toneClass="text-success"
                  accounts={householdAccounts}
                  editedBalances={editedBalances}
                  setEditedBalances={setEditedBalances}
                  updateAccount={updateAccount}
                  toast={toast}
                />
                <AccountSection
                  title="Business accounts"
                  description="Operating cash and business-only ledger balances"
                  icon={<Briefcase className="w-5 h-5" />}
                  toneClass="text-gold"
                  accounts={businessAccounts}
                  editedBalances={editedBalances}
                  setEditedBalances={setEditedBalances}
                  updateAccount={updateAccount}
                  toast={toast}
                />
              </div>
              <div className="space-y-6">
                <AccountSection
                  title="Buckets and reserves"
                  description="House fund, tax set-aside, buffer, and other buckets"
                  icon={<PiggyBank className="w-5 h-5" />}
                  toneClass="text-foreground"
                  accounts={bucketAccounts}
                  editedBalances={editedBalances}
                  setEditedBalances={setEditedBalances}
                  updateAccount={updateAccount}
                  toast={toast}
                />
                {selectedQuickAddAccount && (
                  <Card className="border-border bg-card shadow-lg">
                    <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                      <CardTitle className="text-lg flex items-center gap-2 text-gold">
                        <Plus className="w-5 h-5" /> Quick add to {selectedQuickAddAccount.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {[100, 250, 500, 1000].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            className="border-border hover:bg-gold/10 hover:text-gold"
                            onClick={() => {
                              const current = parseFloat(
                                editedBalances[selectedQuickAddAccount.id] ?? selectedQuickAddAccount.currentBalance.toFixed(2),
                              );
                              setEditedBalances((previous) => ({
                                ...previous,
                                [selectedQuickAddAccount.id]: (current + amount).toFixed(2),
                              }));
                            }}
                          >
                            +${amount}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                    <CardTitle className="text-lg flex items-center gap-2 text-gold">
                      <Landmark className="w-5 h-5" /> How to use this page
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-sm text-muted-foreground">
                    <p>Use the Accounts page for transfers and reconciliation.</p>
                    <p>Use this page when a ledger baseline needs to be corrected to match the bank.</p>
                    <p>Live bank balances should stay the source of truth whenever Plaid is connected.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleAccounts.map((account) => (
                <Button
                  key={account.id}
                  variant={selectedQuickAddId === account.id ? "default" : "outline"}
                  className="border-border"
                  onClick={() => setSelectedQuickAddId(account.id)}
                >
                  {account.name}
                </Button>
              ))}
            </div>
          </div>
        </details>
      </div>
    </Layout>
  );
}
