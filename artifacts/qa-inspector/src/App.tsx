import { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UrlInput } from "./pages/UrlInput";
import { ScanProgress } from "./pages/ScanProgress";
import { Results } from "./pages/Results";
import { Dashboard } from "./pages/Dashboard";
import { useGetScansHistory, useGetScanReport } from "@workspace/api-client-react";
import type { ScanHistory, BrokenLink, UIIssue, FormIssue } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Shield, 
  History as HistoryIcon, 
  Settings, 
  Zap, 
  Globe,
  Clock,
  LayoutDashboard,
  Search,
  ShieldAlert,
  Terminal,
  Sparkles,
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type AppState = "DASHBOARD" | "ISSUES" | "HISTORY" | "SETTINGS" | "IDLE" | "SCANNING" | "RESULTS";

/* ─── Cyberpunk Grid Background ────────────────────────────────────────── */
function CyberpunkBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#060b18]">
      {/* Prime Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 245, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
      {/* Bottom Gradient Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent opacity-80" />
      <div className="scanline" />
    </div>
  );
}

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
function Sidebar({ current, onNavigate }: { current: AppState, onNavigate: (s: AppState) => void }) {
  const isOverview = current === "DASHBOARD" || current === "RESULTS" || current === "SCANNING";
  
  return (
    <div className="w-64 h-screen border-r border-white/5 bg-[#080d1a] flex flex-col p-6 sticky top-0 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => onNavigate("DASHBOARD")}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all duration-500">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-black tracking-[0.05em] text-[16px] leading-none">Testify<span className="text-cyan-400">AI</span></span>
          <span className="text-white/30 font-bold text-[8px] uppercase tracking-[0.2em] mt-1 leading-none">Neural Quality Engine</span>
        </div>
      </div>

      {/* AI Indicator */}
      <div className="mb-10">
        <div className="w-full flex items-center justify-between px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-lg group hover:bg-indigo-600/20 transition-all cursor-default">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Engine Active</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
        </div>
      </div>

      <div className="flex-grow space-y-6">
        <div>
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 ml-1">Navigation</p>
          <div className="space-y-1">
            <NavItem 
              icon={<BarChart3 className="w-4 h-4" />} 
              label="Overview" 
              active={isOverview} 
              onClick={() => onNavigate("DASHBOARD")} 
            />
            <NavItem 
              icon={<ShieldAlert className="w-4 h-4" />} 
              label="Issues" 
              active={current === "ISSUES"} 
              onClick={() => onNavigate("ISSUES")} 
            />
            <NavItem 
              icon={<HistoryIcon className="w-4 h-4" />} 
              label="History" 
              active={current === "HISTORY"} 
              onClick={() => onNavigate("HISTORY")} 
            />
            <NavItem 
              icon={<Settings className="w-4 h-4" />} 
              label="Settings" 
              active={current === "SETTINGS"} 
              onClick={() => onNavigate("SETTINGS")} 
            />
          </div>
        </div>
      </div>

      {/* Footer Info / Team Z */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
             <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-white/60 text-[10px] font-bold tracking-tight">Audit Node v2.4</span>
            <span className="text-emerald-500 text-[8px] uppercase tracking-widest font-mono">Status: Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-white font-black text-[12px] uppercase tracking-[0.1em] drop-shadow-sm">Team Z</span>
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all group ${
        active ? "bg-indigo-600/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={active ? "text-indigo-400" : "text-current"}>{icon}</div>
        <span className="text-xs font-semibold tracking-wide">{label}</span>
      </div>
      {active && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
    </button>
  );
}

/* ─── Step Indicator ────────────────────────────────────────────── */
function StepProgress({ current }: { current: AppState }) {
  const steps = [
    { id: "IDLE" as AppState, label: "Configure", num: 1 },
    { id: "SCANNING" as AppState, label: "Scanning", num: 2 },
    { id: "RESULTS" as AppState, label: "Results", num: 3 },
  ];
  const states = ["DASHBOARD", "IDLE", "SCANNING", "RESULTS", "ISSUES", "HISTORY", "SETTINGS"];
  const currentIdx = states.indexOf(current);

  return (
    <div className="flex items-center gap-8">
      {steps.map((step, i) => {
        const active = step.id === current;
        const done = currentIdx > states.indexOf(step.id) || current === "RESULTS" && i < 2;
        return (
          <div key={step.id} className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  active ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" : 
                  done ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" : "border-white/10 text-white/20"
                }`}>
                  {step.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  active ? "text-white" : done ? "text-indigo-400" : "text-white/20"
                }`}>
                  {step.label}
                </span>
             </div>
             {i < steps.length - 1 && <div className="w-4 h-[1px] bg-white/5" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── History View ────────────────────────────────────────────── */
function HistoryView({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: historyData, isLoading } = useGetScansHistory();
  const history = historyData?.scans || [];

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-indigo-400" />
          <h2 className="text-white font-bold text-xl uppercase tracking-wider">Audit Archive</h2>
       </div>
       
       <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
             Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />)
          ) : history.length === 0 ? (
             <p className="text-white/20 text-xs text-center py-20 border border-white/5 rounded-xl border-dashed uppercase tracking-widest font-mono">Archive Empty</p>
          ) : (
            history.map((record: ScanHistory['scans'][0]) => (
              <div 
                key={record.jobId} 
                onClick={() => onSelect(record.jobId)}
                className="group p-5 bg-[#0c1427] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer rounded-xl flex items-center justify-between"
              >
                 <div className="flex items-center gap-6">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-mono font-bold text-[10px] text-white/40">
                       {Math.round(record.healthScore)}%
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm tracking-tight">{record.targetUrl}</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1 uppercase tracking-widest">{new Date(record.scannedAt).toLocaleString()}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-10">
                    <div className="flex flex-col items-end">
                       <p className="text-white/20 font-bold text-[8px] uppercase tracking-widest">Bugs</p>
                       <p className="text-white font-bold">{record.totalBugs}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-white/40 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                       <HistoryIcon className="w-3.5 h-3.5" />
                    </div>
                 </div>
              </div>
            ))
          )}
       </div>
    </div>
  );
}

/* ─── Issues View ────────────────────────────────────────────── */
function IssuesView({ onViewReport }: { onViewReport: (id: string) => void }) {
  const { data: historyData } = useGetScansHistory();
  const latestScan = historyData?.scans?.[0];
  
  const { data: reportData, isLoading } = useGetScanReport(latestScan?.jobId || "", {
    query: { 
      enabled: !!latestScan?.jobId,
      queryKey: ["/api/scan", latestScan?.jobId, "report_view"] 
    }
  });

  const issues = useMemo(() => {
    if (!reportData) return [];
    return [
      ...(reportData.brokenLinks || []).map((link: BrokenLink) => ({
        title: `Broken Link: ${link.linkUrl}`,
        description: `Status ${link.statusCode} on ${link.sourcePage}`,
        severity: "HIGH",
        type: "LINK"
      })),
      ...(reportData.uiIssues || []).map((ui: UIIssue) => ({
        title: ui.issueType,
        description: ui.description,
        severity: ui.severity.toUpperCase(),
        type: "UI"
      })),
      ...(reportData.formIssues || []).map((form: FormIssue) => ({
        title: form.issueType,
        description: form.description,
        severity: form.severity.toUpperCase(),
        type: "FORM"
      }))
    ];
  }, [reportData]);

  if (isLoading) return <div className="h-full flex items-center justify-center text-white/20 font-mono text-xs animate-pulse">Aggregating Issues...</div>;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <ShieldAlert className="w-5 h-5 text-indigo-400" />
             <h2 className="text-white font-bold text-xl uppercase tracking-wider">Audit Intelligence Repository</h2>
          </div>
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40">
             SOURCE: {latestScan?.targetUrl || "N/A"}
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
          {issues.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center border border-white/5 border-dashed rounded-2xl">
                <Search className="w-10 h-10 text-white/5 mb-4" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/20">No data anomalies detected in latest cycle</p>
             </div>
          ) : (
            issues.map((issue: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => latestScan && onViewReport(latestScan.jobId)}
                className="group p-5 bg-[#0c1427] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer rounded-2xl flex items-center justify-between"
              >
                  <div className="flex items-center gap-6">
                    <div className={cn("w-1 h-10 rounded-full", {
                      "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]": issue.severity === "CRITICAL",
                      "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]": issue.severity === "HIGH",
                      "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]": issue.severity === "MEDIUM",
                      "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]": issue.severity === "LOW",
                    })} />
                    <div>
                       <div className="flex items-center gap-3 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">{issue.type}</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{issue.severity} Severity</span>
                       </div>
                       <p className="text-white font-bold text-sm tracking-tight">{issue.title}</p>
                       <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{issue.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[9px] font-mono text-white/10 group-hover:text-indigo-400 transition-colors uppercase">View Detail →</span>
                  </div>
              </div>
            ))
          )}
       </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
function MainApp() {
  const [appState, setAppState] = useState<AppState>("DASHBOARD");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [rescanUrl, setRescanUrl] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const jobParam = params.get("jobId");
    if (jobParam) {
      setCurrentJobId(jobParam);
      setAppState("RESULTS");
    }
  }, []);

  const handleScanStarted = (jobId: string) => {
    setCurrentJobId(jobId);
    setAppState("SCANNING");
    setRescanUrl(undefined);
    window.history.pushState({}, "", `?jobId=${jobId}`);
  };

  const handleScanComplete = () => setAppState("RESULTS");

  const handleReset = () => {
    setAppState("DASHBOARD");
    setCurrentJobId(null);
    setRescanUrl(undefined);
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleStartNewScan = () => {
    setAppState("IDLE");
  };

  const handleViewReport = (jobId: string) => {
    setCurrentJobId(jobId);
    setAppState("RESULTS");
    window.history.pushState({}, "", `?jobId=${jobId}`);
  };

  const handleCancel = () => {
    setAppState("DASHBOARD");
    setCurrentJobId(null);
    setRescanUrl(undefined);
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleRescan = (url: string) => {
    setRescanUrl(url);
    setCurrentJobId(null);
    setAppState("IDLE");
    window.history.pushState({}, "", window.location.pathname);
  };

  return (
    <div className={`flex min-h-screen font-sans transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <Sidebar current={appState} onNavigate={setAppState} />

      <div className="flex-grow flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-[#080d1a]/50 backdrop-blur-md sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                <Globe className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-white/80 font-mono text-sm tracking-tight truncate max-w-[300px]">
                    {currentJobId ? "Scanning System Core" : "Ready for Audit"}
                 </span>
                 <div className="w-1 h-1 rounded-full bg-white/20" />
                 <div className="flex items-center gap-2 text-white/40 font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>Live Session</span>
                 </div>
              </div>
           </div>

           <StepProgress current={appState} />
        </header>

        <main className="flex-grow p-8 overflow-y-auto bg-[#060b18]/50">
          {appState === "DASHBOARD" && (
            <Dashboard onStartNewScan={handleStartNewScan} onViewReport={handleViewReport} />
          )}
          {appState === "IDLE" && (
            <UrlInput onScanStarted={handleScanStarted} initialUrl={rescanUrl} />
          )}
          {appState === "SCANNING" && currentJobId && (
            <ScanProgress jobId={currentJobId} onScanComplete={handleScanComplete} onCancel={handleCancel} />
          )}
          {appState === "RESULTS" && currentJobId && (
            <Results jobId={currentJobId} onReset={handleReset} onRescan={handleRescan} />
          )}
          {appState === "ISSUES" && (
            <IssuesView onViewReport={handleViewReport} />
          )}
          {appState === "HISTORY" && (
             <HistoryView onSelect={handleViewReport} />
          )}
          {appState === "SETTINGS" && (
             <div className="flex flex-col items-center justify-center h-full text-white/20">
               <Settings className="w-16 h-16 mb-4 opacity-10" />
               <p className="font-mono text-xs uppercase tracking-[0.3em]">System Configuration</p>
               <p className="text-[10px] mt-2">Manage scan concurrency, AI models, and reporting parameters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
    
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    ::selection {
      background: rgba(99, 102, 241, 0.2);
      color: #fff;
    }
    
    .scanline {
      width: 100%;
      height: 100px;
      z-index: 10;
      background: linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 245, 255, 0.02) 50%, rgba(0, 0, 0, 0) 100%);
      opacity: 0.1;
      position: fixed;
      bottom: 100%;
      animation: scanline 10s linear infinite;
    }

    @keyframes scanline {
      0% { bottom: 100%; }
      100% { bottom: -100px; }
    }
  `}</style>
);

/* ─── Root ───────────────────────────────────────────────────────────────── */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalStyles />
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;