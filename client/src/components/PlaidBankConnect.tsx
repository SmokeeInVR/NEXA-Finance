import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, CreditCard, RefreshCw, Trash2, Wifi, WifiOff, DollarSign, PiggyBank } from "lucide-react";

// ─── Types ───────────────────────────────────────────────
interface PlaidAccount {
  accountId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
  institutionName?: string;
}

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

// ─── Format helpers ──────────────────────────────────────
const fmt = (n: number | null) =>
  n == null ? "N/A" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const accountIcon = (type: string) => {
  if (type === "credit") return <CreditCard className="w-4 h-4 text-orange-400" />;
  if (type === "investment") return <DollarSign className="w-4 h-4 text-purple-400" />;
  return <PiggyBank className="w-4 h-4 text-emerald-400" />;
};

// ─── Component ───────────────────────────────────────────
export function PlaidBankConnect() {
  const qc = useQueryClient();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Fetch connected accounts
  const { data, isLoading, refetch } = useQuery<PlaidAccountsData>({
    queryKey: ["/api/plaid/accounts"],
    refetchInterval: 60000,
  });

  // Get link token then open Plaid
  const getLinkToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      const json = await res.json();
      setLinkToken(json.link_token);
    } catch (e) {
      console.error("Link token error:", e);
    } finally {
      setIsGeneratingToken(false);
    }
  };
  // Exchange token after user authenticates
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
    },
  });

  // Sync balances
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/sync");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/plaid/accounts"] }),
  });

  // Disconnect a bank
  const disconnectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/plaid/disconnect/${itemId}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/plaid/accounts"] }),
  });

  // Plaid Link config — only active when we have a token
  const onSuccess = useCallback((public_token: string, metadata: any) => {
    const institution = metadata?.institution?.name || "My Bank";
    exchangeMutation.mutate({ public_token, institution });
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  // Auto-open Plaid Link once we have a token
  const handleConnect = async () => {
    await getLinkToken();
  };
  // Open Plaid as soon as token + SDK are ready
  const [pendingOpen, setPendingOpen] = useState(false);

  const triggerConnect = async () => {
    setIsGeneratingToken(true);
    setPendingOpen(true);
    try {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      const json = await res.json();
      setLinkToken(json.link_token);
    } catch (e) {
      console.error("Link token error:", e);
      setPendingOpen(false);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // When ready + pendingOpen, fire Plaid
  if (ready && pendingOpen && linkToken) {
    setPendingOpen(false);
    open();
  }

  const isConnected = data?.connected && (data?.institutions?.length ?? 0) > 0;

  // ─── Render ───
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected
            ? <Wifi className="w-5 h-5 text-emerald-400" />
            : <WifiOff className="w-5 h-5 text-gray-400" />}
          <span className="text-sm font-medium text-gray-300">
            {isConnected ? `${data!.institutions.length} bank${data!.institutions.length > 1 ? "s" : ""} connected` : "No banks connected"}
          </span>
        </div>
        <div className="flex gap-2">
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
          <Button
            size="sm"
            onClick={triggerConnect}
            disabled={isGeneratingToken || (!!linkToken && !ready)}
            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Building2 className="w-3 h-3" />
            {isGeneratingToken ? "Connecting..." : "Connect Bank"}
          </Button>
        </div>
      </div>
      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8 text-gray-400 text-sm">Loading accounts...</div>
      )}

      {/* Not connected state */}
      {!isLoading && !isConnected && (
        <Card className="border-dashed border-gray-700 bg-gray-900/40">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Building2 className="w-10 h-10 text-gray-600" />
            <p className="text-gray-400 text-sm text-center">
              Connect your bank account to see real balances and transactions
            </p>
            <Button
              onClick={triggerConnect}
              disabled={isGeneratingToken}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isGeneratingToken ? "Opening Plaid..." : "Connect a Bank Account"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected institutions */}
      {isConnected && data!.institutions.map((institution) => (
        <Card key={institution.itemId} className="bg-gray-900/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
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
            {institution.accounts.map((acct, i) => (
              <div key={acct.accountId}>
                {i > 0 && <Separator className="bg-gray-800 my-2" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {accountIcon(acct.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-200">{acct.name}</p>
                      <p className="text-xs text-gray-500">
                        {acct.subtype} {acct.mask ? `····${acct.mask}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-100">{fmt(acct.balance)}</p>
                    {acct.availableBalance != null && acct.availableBalance !== acct.balance && (
                      <p className="text-xs text-gray-500">{fmt(acct.availableBalance)} avail</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Total bar */}
      {isConnected && (
        <div className="flex justify-between items-center px-1 text-sm">
          <span className="text-gray-400">Total cash (depository)</span>
          <span className="font-bold text-emerald-400">{fmt(data!.totalBalance)}</span>
        </div>
      )}
    </div>
  );
}
