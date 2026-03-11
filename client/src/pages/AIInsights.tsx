import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, Sparkles, RefreshCw, DollarSign, CreditCard, PiggyBank, Volume2, VolumeX } from "lucide-react";

const RAILWAY_URL = import.meta.env.VITE_API_URL || "";

type InsightType = "spending" | "debt" | "budget" | "wealth";

interface InsightCard {
  type: InsightType;
  title: string;
  description: string;
  icon: any;
  prompt: string;
}

const insightCards: InsightCard[] = [
  {
    type: "spending",
    title: "Spending Analysis",
    description: "Analyze my spending habits and where my money is going",
    icon: DollarSign,
    prompt: "spending_analysis"
  },
  {
    type: "debt",
    title: "Debt Freedom Roadmap",
    description: "Build a personalized strategy to become debt free",
    icon: CreditCard,
    prompt: "debt_roadmap"
  },
  {
    type: "budget",
    title: "Budget Optimizer",
    description: "Optimize my budget to hit my financial goals faster",
    icon: Target,
    prompt: "budget_optimizer"
  },
  {
    type: "wealth",
    title: "Post-Debt Wealth Plan",
    description: "Plan how to build wealth, invest and save for a home once debt free",
    icon: PiggyBank,
    prompt: "wealth_plan"
  }
];

function buildPrompt(type: string, data: any): string {
  const base = `You are a personal financial advisor analyzing real financial data. Be specific, actionable, and encouraging. Use the actual numbers provided. Keep your response concise but impactful — use short paragraphs and bullet points where helpful.

Here is the user's current financial data:
- Total Cash: $${data.cash?.total?.toFixed(2) || "0"}
- Weekly Income (Me): $${data.income?.myIncome?.toFixed(2) || "0"}
- Weekly Income (Spouse): $${data.income?.spouseIncome?.toFixed(2) || "0"}
- Total Weekly Income: $${data.income?.totalWeekly?.toFixed(2) || "0"}
- Estimated Monthly Income: $${data.income?.estimatedMonthly?.toFixed(2) || "0"}
- Monthly Fixed Bills: $${data.budget?.monthlyFixedBills?.toFixed(2) || "0"}
- Spending Last 30 Days: $${data.spending?.last30Days?.toFixed(2) || "0"}
- Total Debt Remaining: $${data.debts?.totalRemaining?.toFixed(2) || "0"}
- Number of Debts: ${data.debts?.count || 0}
${data.debts?.items?.map((d: any) => `  • ${d.name}: $${parseFloat(d.remainingBalance).toFixed(2)} at ${d.apr}% APR, $${d.monthlyPayment}/mo`).join("\n") || ""}
${data.fire ? `- Invested Balance: $${parseFloat(data.fire.investedBalance).toFixed(2)}
- Monthly Investment Contribution: $${parseFloat(data.fire.monthlyContribution).toFixed(2)}
- Target Monthly Income in Retirement: $${parseFloat(data.fire.targetMonthlyIncome).toFixed(2)}
- Current Age: ${data.fire.currentAge}, Target Retirement Age: ${data.fire.targetAge}` : ""}

Accounts:
${data.accounts?.filter((a: any) => !a.excludeFromTotals).map((a: any) => `  • ${a.name}: $${a.currentBalance?.toFixed(2)}`).join("\n") || ""}
`;

  if (type === "spending_analysis") {
    return base + `\nAnalyze this person's spending habits. Identify where most money is going, flag any concerns, compare spending to income, and give 2-3 specific actionable tips to reduce unnecessary spending.`;
  }
  if (type === "debt_roadmap") {
    return base + `\nCreate a personalized debt freedom roadmap. Compare avalanche vs snowball strategy for their specific debts. Calculate approximate months to debt freedom at current payment rate, and what happens if they add $100, $200, or $500 extra per month. Give them a projected debt-free date and motivate them.`;
  }
  if (type === "budget_optimizer") {
    return base + `\nAnalyze their budget and optimize it. Look at income vs bills vs spending vs debt payments. Identify how much discretionary income they have. Suggest an ideal weekly/monthly budget breakdown to accelerate their goals. Be specific with dollar amounts.`;
  }
  if (type === "wealth_plan") {
    return base + `\nCreate a post-debt wealth building plan. Once they are debt free, how should they redirect those debt payments? Give a specific plan for investing, trading, and saving for a home with land. Include realistic timelines and milestones based on their income. Make it inspiring and concrete.`;
  }
  return base + `\nProvide a comprehensive financial health summary and top 3 recommendations.`;
}

// Strip markdown so ElevenLabs reads naturally
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,3}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[•\-]\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

// Animated JARVIS-style speaking bars
function SpeakingOrb({ speaking }: { speaking: boolean }) {
  const heights = [8, 16, 12, 20, 14, 18, 10];
  return (
    <div className="flex items-center gap-[3px]" aria-label="Speaking">
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-primary"
          style={{
            width: "3px",
            height: speaking ? `${h}px` : "3px",
            opacity: speaking ? 0.9 : 0.3,
            transition: `height ${200 + i * 40}ms ease-in-out, opacity 200ms ease`,
            animation: speaking ? `speakPulse ${600 + i * 80}ms ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes speakPulse {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
}

export default function AIInsights() {
  const [activeInsight, setActiveInsight] = useState<InsightType | null>(null);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
    setLoadingVoice(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    stopSpeaking();
    setLoadingVoice(true);

    try {
      const clean = stripMarkdown(text);
      const res = await fetch(`${RAILWAY_URL}/api/ai/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean })
      });

      if (!res.ok) {
        console.error("TTS failed:", res.status);
        setLoadingVoice(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { setSpeaking(true); setLoadingVoice(false); };
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); setLoadingVoice(false); };

      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setLoadingVoice(false);
    }
  }, [voiceEnabled, stopSpeaking]);

  const toggleVoice = () => {
    if (speaking || loadingVoice) stopSpeaking();
    setVoiceEnabled(v => !v);
  };

  async function runInsight(card: InsightCard) {
    stopSpeaking();
    setActiveInsight(card.type);
    setResponse("");
    setError("");
    setLoading(true);

    try {
      const dataRes = await fetch(`${RAILWAY_URL}/api/os/summary`);
      const financialData = await dataRes.json();

      const aiRes = await fetch(`${RAILWAY_URL}/api/ai/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(card.prompt, financialData) })
      });

      const aiData = await aiRes.json();
      const text = aiData.content?.[0]?.text || aiData.message || JSON.stringify(aiData);
      setResponse(text);

      if (voiceEnabled) {
        speak(text);
      }
    } catch (err) {
      setError("Failed to load insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activeCard = insightCards.find(c => c.type === activeInsight);

  return (
    <Layout title="AI Insights">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of your real financial data
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVoice}
            className={`h-8 w-8 p-0 rounded-full transition-colors ${
              voiceEnabled
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-secondary"
            }`}
            title={voiceEnabled ? "Voice on — click to mute" : "Voice off — click to enable"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-2 gap-3">
          {insightCards.map((card) => {
            const Icon = card.icon;
            const isActive = activeInsight === card.type;
            return (
              <Card
                key={card.type}
                className={`cursor-pointer transition-all duration-200 border ${
                  isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => runInsight(card)}
              >
                <CardContent className="p-3">
                  <Icon className={`w-5 h-5 mb-2 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-bold">{card.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Response Area */}
        {(loading || response || error) && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {activeCard?.title}

                {(speaking || loadingVoice) && (
                  <div className="ml-1 flex items-center gap-1.5">
                    {loadingVoice && !speaking
                      ? <span className="text-[10px] text-muted-foreground animate-pulse">loading voice...</span>
                      : <SpeakingOrb speaking={speaking} />
                    }
                  </div>
                )}

                <div className="ml-auto flex items-center gap-1">
                  {response && voiceEnabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => (speaking || loadingVoice) ? stopSpeaking() : speak(response)}
                      title={(speaking || loadingVoice) ? "Stop" : "Read aloud"}
                    >
                      {(speaking || loadingVoice)
                        ? <VolumeX className="w-3 h-3" />
                        : <Volume2 className="w-3 h-3" />
                      }
                    </Button>
                  )}
                  {!loading && response && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => activeCard && runInsight(activeCard)}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing your financial data...
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {response && (
                <div className="text-sm text-foreground leading-relaxed space-y-2">
                  {response.split("\n").map((line, i) => {
                    if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-primary text-sm mt-3">{line.replace(/###\s/, "")}</h3>;
                    if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-foreground text-base mt-4">{line.replace(/##\s/, "")}</h2>;
                    if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-foreground text-lg mt-4">{line.replace(/#\s/, "")}</h1>;
                    if (line.startsWith("• ") || line.startsWith("- ")) return <div key={i} className="flex gap-2 ml-2"><span className="text-primary mt-0.5">•</span><span dangerouslySetInnerHTML={{__html: line.replace(/^[•\-]\s/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}} /></div>;
                    if (line.trim() === "") return <div key={i} className="h-1" />;
                    return <p key={i} dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}} />;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
