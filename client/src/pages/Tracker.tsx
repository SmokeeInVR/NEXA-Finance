import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertWeeklyIncomeLogSchema, type WeeklyIncomeLog, type AccountBalance } from "@shared/schema";
import { Loader2, Plus, Trash2, Save, Calendar as CalendarIcon, History } from "lucide-react";
import { format } from "date-fns";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";

export default function Tracker() {
  const { toast } = useToast();
  
  // Queries
  const { data: incomeLogs, isLoading: loadingLogs } = useQuery<WeeklyIncomeLog[]>({
    queryKey: ["/api/income"],
  });

  const { data: balances, isLoading: loadingBalances } = useQuery<AccountBalance[]>({
    queryKey: ["/api/balances"],
  });

  const { data: latestIncome, refetch: refetchLatestIncome } = useQuery({
    queryKey: ["/api/income/latest"],
  });

  const [savedLatest, setSavedLatest] = useState<any>(null);

  useEffect(() => {
    if (latestIncome) {
      setSavedLatest(latestIncome);
    }
  }, [latestIncome]);

  // Mutations
  const saveIncomeLog = useMutation({
    mutationFn: async (data: any) => {
      console.log("Tracker: form submitting data:", data);
      const payload = {
        ...data,
        myIncome: String(data.myIncome),
        spouseIncome: String(data.spouseIncome)
      };
      console.log("Tracker: Sending income payload:", payload);
      const res = await apiRequest("POST", "/api/income", payload);
      const result = await res.json();
      console.log("Tracker: Received income result:", result);
      return result;
    },
    onSuccess: async (data) => {
      console.log("Tracker: Save success, invalidating queries...");
      await queryClient.invalidateQueries();
      
      console.log("Tracker: Refetching latest income...");
      const { data: latest } = await refetchLatestIncome();
      console.log("Tracker: New latest income from refetch:", latest);
      if (latest) {
        setSavedLatest(latest);
      }

      toast({ title: "Success", description: "Income log saved" });
      form.reset({
        weekStartDate: format(new Date(), "yyyy-MM-dd"),
        myIncome: "0",
        spouseIncome: "0",
        notes: "",
      });
    },
    onError: (error: any) => {
      console.error("Tracker: Income save error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save income log",
        variant: "destructive"
      });
    }
  });

  const deleteIncomeLog = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/income/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await refetchLatestIncome();
      toast({ title: "Success", description: "Income log deleted" });
    },
  });

  const saveBalances = useMutation({
    mutationFn: async (data: any[]) => {
      const res = await apiRequest("POST", "/api/balances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      toast({ title: "Success", description: "Balances updated" });
    },
  });

  // Forms
  const form = useForm({
    resolver: zodResolver(insertWeeklyIncomeLogSchema),
    defaultValues: {
      weekStartDate: format(new Date(), "yyyy-MM-dd"),
      myIncome: "0",
      spouseIncome: "0",
      notes: "",
    },
  });

  const [editableBalances, setEditableBalances] = useState<AccountBalance[]>([]);

  useEffect(() => {
    if (balances) {
      setEditableBalances(balances);
    }
  }, [balances]);

  const handleBalanceChange = (name: string, value: string) => {
    setEditableBalances(prev => 
      prev.map(b => b.name === name ? { ...b, balance: value } : b)
    );
  };

  const onSaveBalances = () => {
    saveBalances.mutate(editableBalances.map(({ name, balance }) => ({ name, balance })));
  };

  if (loadingLogs || loadingBalances) {
    return (
      <Layout title="Tracker">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Tracker">
      <div className="space-y-6 pb-20">
        {/* Weekly Income Log Section */}
        <Card className="shadow-2xl border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Plus className="w-5 h-5" /> Log Weekly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => saveIncomeLog.mutate(data))} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Week Start Date</Label>
                <Input 
                  type="date" 
                  {...form.register("weekStartDate")}
                  className="h-12 text-black bg-white rounded-xl font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MoneyInput
                  label="My Income"
                  {...form.register("myIncome")}
                  className="text-black bg-white"
                />
                <MoneyInput
                  label="Spouse Income"
                  {...form.register("spouseIncome")}
                  className="text-black bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Notes (Optional)</Label>
                <Textarea 
                  {...form.register("notes")}
                  placeholder="Bonus, overtime, etc."
                  className="rounded-xl resize-none bg-white text-black min-h-[80px]"
                />
              </div>
              <Button 
                type="submit" 
                disabled={saveIncomeLog.isPending}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-gold/20"
              >
                {saveIncomeLog.isPending ? "Saving..." : "Save Weekly Entry"}
              </Button>
            </form>
            {savedLatest && (
              <div className="mt-4 p-3 bg-secondary/20 rounded-lg border border-border">
                <p className="text-[10px] font-mono text-gold uppercase tracking-widest font-bold">LATEST INCOME IN DB:</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  weekStartDate={savedLatest.weekStartDate}, myIncome={savedLatest.myIncome}, spouseIncome={savedLatest.spouseIncome}, total={savedLatest.totalWeeklyIncome || (parseFloat(savedLatest.myIncome) + parseFloat(savedLatest.spouseIncome))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Income Logs */}
        <Card className="shadow-lg border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y divide-border">
              {incomeLogs?.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground/40 italic text-xs uppercase tracking-widest">No entries yet.</p>
              ) : (
                incomeLogs?.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3 text-gold" />
                        <span className="text-sm font-bold text-white">
                          {format(new Date(log.weekStartDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs font-mono font-bold">
                        <span className="text-gold">Me: ${parseFloat(log.myIncome).toFixed(0)}</span>
                        <span className="text-gold">Spouse: ${parseFloat(log.spouseIncome).toFixed(0)}</span>
                      </div>
                      {log.notes && <p className="text-[11px] text-muted-foreground italic truncate max-w-[220px]">"{log.notes}"</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Delete this entry?")) deleteIncomeLog.mutate(log.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balances Section */}
        <Card className="shadow-2xl border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Save className="w-5 h-5" /> Account Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              {editableBalances.map((balance) => (
                <div key={balance.name} className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                      {balance.name}
                    </Label>
                    <span className="text-[9px] text-muted-foreground/40 font-bold">
                      {balance.updatedAt ? format(new Date(balance.updatedAt), "MM/dd HH:mm") : "Never"}
                    </span>
                  </div>
                  <MoneyInput
                    label=""
                    value={balance.balance}
                    onChange={(e) => handleBalanceChange(balance.name, e.target.value)}
                    className="h-11 text-black bg-white text-lg font-bold"
                    onBlur={onSaveBalances}
                  />
                </div>
              ))}
            </div>
            <Button 
              onClick={onSaveBalances}
              disabled={saveBalances.isPending}
              className="w-full h-12 rounded-xl bg-success text-success-foreground font-bold text-base shadow-lg shadow-success/20 mt-2"
            >
              {saveBalances.isPending ? "Updating..." : "Save All Balances"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
