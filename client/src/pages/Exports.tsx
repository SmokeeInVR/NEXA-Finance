import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, TrendingDown, Car } from "lucide-react";
import { api, buildUrl } from "@shared/routes";

export default function Exports() {
  const handleDownload = async (type: "expenses" | "mileage" | "debts", filename: string) => {
    const url = buildUrl(api.exports.csv.path, { type });
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="Export Data">
      <div className="space-y-6">
        <Card className="border-border shadow-xl bg-card overflow-hidden">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold text-lg">
              <FileText className="w-5 h-5" />
              Expenses CSV
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest mt-1">
              Business expense records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-gold/20" 
              onClick={() => handleDownload("expenses", "business-expenses")}
            >
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xl bg-card overflow-hidden">
          <div className="h-1.5 bg-success w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold text-lg">
              <Car className="w-5 h-5" />
              Mileage CSV
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest mt-1">
              Detailed mileage logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-gold/20" 
              onClick={() => handleDownload("mileage", "mileage-log")}
            >
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xl bg-card overflow-hidden">
          <div className="h-1.5 bg-destructive w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold text-lg">
              <TrendingDown className="w-5 h-5" />
              Debts CSV
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest mt-1">
              Current debt snapshot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-gold/20" 
              onClick={() => handleDownload("debts", "debts-snapshot")}
            >
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
