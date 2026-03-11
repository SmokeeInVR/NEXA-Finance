import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Business from "@/pages/Business";
import Spending from "@/pages/Spending";
import Accounts from "@/pages/Accounts";
import SettingsPage from "@/pages/SettingsPage";
import Invest from "@/pages/Invest";
import AIInsights from "@/pages/AIInsights";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/spending" component={Spending} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/business" component={Business} />
      <Route path="/invest" component={Invest} />
      <Route path="/ai" component={AIInsights} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
