import { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Search,
  Layers,
  Zap,
  ShieldAlert,
  Layout
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useGetScansHistory } from "@workspace/api-client-react";
import { useGetScanReport } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onStartNewScan: () => void;
  onViewReport: (jobId: string) => void;
}

export function Dashboard({ onStartNewScan, onViewReport }: DashboardProps) {
  const { data: historyData, isLoading } = useGetScansHistory();
  const history = historyData?.scans || [];
  
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Get most recent scan as the "active" view data
  const latestScan = history[0];
  
  const { data: reportData, isLoading: reportLoading } = useGetScanReport(latestScan?.jobId || "", {
    query: { 
      enabled: !!latestScan?.jobId,
      queryKey: ["/api/scan", latestScan?.jobId, "report"] 
    }
  });

  const issues = useMemo(() => {
    if (!reportData) return [];
    
    const combined = [
      ...(reportData.brokenLinks || []).map(link => ({
        title: `Broken Link: ${link.linkUrl}`,
        description: `Status ${link.statusCode} on ${link.sourcePage}`,
        severity: "HIGH"
      })),
      ...(reportData.uiIssues || []).map(ui => ({
        title: `UI Issue: ${ui.issueType}`,
        description: ui.description,
        severity: ui.severity.toUpperCase()
      })),
      ...(reportData.formIssues || []).map(form => ({
        title: `Form Issue: ${form.issueType}`,
        description: form.description,
        severity: form.severity.toUpperCase()
      }))
    ];
    
    return combined;
  }, [reportData]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesFilter = filter === "ALL" || issue.severity === filter;
      const matchesSearch = issue.title.toLowerCase().includes(search.toLowerCase()) || 
                           issue.description.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [issues, filter, search]);

  const stats = reportData?.summary?.severityCounts || {
    high: 0,
    medium: 0,
    low: 0
  };

  const healthScore = reportData?.summary?.healthScore ?? latestScan?.healthScore ?? 100;
  const totalIssues = reportData?.summary?.totalBugs ?? latestScan?.totalBugs ?? 0;
  const pagesScanned = reportData?.totalPages ?? latestScan?.pagesScanned ?? 0;

  if (isLoading) {
     return <div className="h-full w-full flex items-center justify-center text-white/20 font-mono text-xs animate-pulse">Initializing Dashboard...</div>;
  }

  return (
    <div className="w-full h-full animate-fade-in space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── Left Column: Health Score & Severities ── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Health Score Card */}
          <Card className="bg-[#0c1427] border-white/5 rounded-2xl overflow-hidden relative shadow-2xl">
            <CardContent className="p-10">
               <div className="flex items-start justify-between mb-8">
                  <div className="space-y-1">
                    <h3 className="text-white/40 font-bold text-[10px] uppercase tracking-[0.2em]">QA Health Score</h3>
                    <p className="text-white/80 font-bold text-[17px]">Overall quality assessment <br />across all checks</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={onStartNewScan}
                       className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2"
                     >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Initialize Audit</span>
                     </button>
                     <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 font-bold text-[10px]">
                        <TrendingUp className="w-3 h-3" />
                        <span>Good</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-16">
                  {/* Circular Gauge */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90">
                        <circle cx="96" cy="96" r="88" className="fill-none stroke-white/5" strokeWidth="12" />
                        <circle 
                          cx="96" cy="96" r="88" 
                          className={cn("fill-none shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-1000", 
                            healthScore >= 80 ? "stroke-cyan-400" : healthScore >= 50 ? "stroke-amber-400" : "stroke-rose-400"
                          )}
                          strokeWidth="12" 
                          strokeDasharray={2 * Math.PI * 88}
                          strokeDashoffset={(2 * Math.PI * 88) * (1 - healthScore / 100)}
                          strokeLinecap="round"
                        />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                        <span className="text-6xl font-black text-white leading-none">{healthScore}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Healthy</span>
                     </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="space-y-10">
                     <div className="space-y-1">
                        <p className="text-white/20 font-bold text-[9px] uppercase tracking-widest">Total Issues</p>
                        <p className="text-4xl font-bold text-white tabular-nums">{totalIssues}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-white/20 font-bold text-[9px] uppercase tracking-widest">Pages Scanned</p>
                        <p className="text-4xl font-bold text-white uppercase tabular-nums">{pagesScanned || 1}</p>
                     </div>
                  </div>
               </div>

               <div className="mt-12 flex items-center gap-4">
                  <div className="h-1 bg-white/5 flex-grow rounded-full overflow-hidden">
                     <div className={cn("h-full transition-all duration-1000", healthScore >= 80 ? "bg-cyan-400/50" : healthScore >= 50 ? "bg-amber-400/50" : "bg-rose-400/50")} style={{ width: `${healthScore}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white/20 font-mono">{healthScore}/100</span>
               </div>
            </CardContent>
          </Card>

          {/* Severity Grid */}
          <div className="grid grid-cols-2 gap-4">
             <SeverityBox label="Critical" count={stats.high} color="rose" desc="Broken functionality" icon={<Zap className="w-4 h-4" />} />
             <SeverityBox label="High" count={stats.high} color="orange" desc="UX / Click issues" icon={<ShieldCheck className="w-4 h-4" />} />
             <SeverityBox label="Medium" count={stats.medium} color="amber" desc="Accessibility" icon={<AlertTriangle className="w-4 h-4" />} />
             <SeverityBox label="Low" count={stats.low} color="cyan" desc="Minor issues" icon={<Layers className="w-4 h-4" />} />
          </div>
        </div>

        {/* ── Right Column: Issues Log ── */}
        <div className="lg:col-span-5 h-full">
          <Card className="bg-[#0c1427] border-white/5 rounded-2xl h-full flex flex-col shadow-2xl">
            <CardContent className="p-8 flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-white font-bold text-[15px]">Issues Log</h3>
                  <span className="bg-white/5 text-white/40 text-[9px] px-2 py-0.5 rounded border border-white/5">{filteredIssues.length} results</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                 <input 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search issues..."
                   className="w-full bg-[#121b33] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                 />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1 p-1 bg-[#121b33] rounded-xl border border-white/5 shrink-0">
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "flex-grow px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      filter === tab ? "bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Issues List or Empty State */}
              <div className="flex-grow overflow-y-auto scrollbar-hide space-y-3">
                 {filteredIssues.length > 0 ? (
                    filteredIssues.map((issue, idx) => (
                      <div 
                        key={idx}
                        onClick={() => onViewReport(latestScan!.jobId)}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer group"
                      >
                         <div className="flex items-start justify-between mb-2">
                            <span className={cn("text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", {
                              "bg-rose-500/20 text-rose-400": issue.severity === "CRITICAL",
                              "bg-orange-500/20 text-orange-400": issue.severity === "HIGH",
                              "bg-amber-500/20 text-amber-400": issue.severity === "MEDIUM",
                              "bg-cyan-500/20 text-cyan-400": issue.severity === "LOW",
                            })}>
                              {issue.severity}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-indigo-400 transition-colors" />
                         </div>
                         <p className="text-white font-bold text-xs line-clamp-1">{issue.title}</p>
                         <p className="text-white/30 text-[10px] line-clamp-2 mt-1">{issue.description}</p>
                      </div>
                    ))
                 ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                     <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                        <Search className="w-8 h-8 text-white/20" />
                     </div>
                     <div className="space-y-1">
                       <p className="text-white font-bold text-sm">No issues match your filter</p>
                       <p className="text-white/60 text-xs text-[10px]">Try adjusting your severity selection or <br />initializing a new scan.</p>
                     </div>
                  </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function SeverityBox({ label, count, color, desc, icon }: { label: string, count: number, color: 'rose' | 'orange' | 'amber' | 'cyan', desc: string, icon: React.ReactNode }) {
  const colors = {
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400 group-hover:bg-orange-500/20",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20",
  };

  return (
    <div className={cn("p-6 rounded-2xl border flex items-center justify-between group transition-all cursor-default", colors[color])}>
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">
             {icon}
          </div>
          <div className="space-y-1">
             <p className="font-bold text-sm uppercase tracking-wide text-white">{label}</p>
             <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest leading-none">{desc}</p>
          </div>
       </div>
       <span className="text-2xl font-bold text-white/80">{count}</span>
    </div>
  );
}
