import { useEffect } from "react";
import { CheckSquare, Square, RefreshCcw, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetScanStatus, useCancelScan } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface ScanProgressProps {
  jobId: string;
  onScanComplete: () => void;
  onCancel: () => void;
}

export function ScanProgress({ jobId, onScanComplete, onCancel }: ScanProgressProps) {
  const { data: status } = useGetScanStatus(jobId, {
    query: {
      queryKey: ["getScanStatus", jobId],
      refetchInterval: (query: any) => {
        const state = query.state.data?.status;
        return state === "completed" || state === "failed" ? false : 2000;
      },
    },
  });

  const cancelMutation = useCancelScan({
    mutation: {
      onSuccess: () => {
        onCancel();
      },
    },
  });

  useEffect(() => {
    if (status?.status === "completed") {
      const timer = setTimeout(() => {
        onScanComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status?.status, onScanComplete]);

  const progress = status?.progress || 0;
  const steps = status?.steps || [
    { name: "crawling", label: "Crawling Pages", status: "pending" as const },
    { name: "links", label: "Checking Links", status: "pending" as const },
    { name: "ui", label: "UI Inspection", status: "pending" as const },
    { name: "forms", label: "Form Testing", status: "pending" as const },
    { name: "report", label: "Generating Report", status: "pending" as const },
  ];

  if (status?.status === 'failed') {
    const isCancelled = status.error === 'Scan cancelled by user';
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6 text-destructive flex flex-col items-center justify-center text-center">
            {isCancelled ? (
              <XCircle className="w-10 h-10 mb-4" />
            ) : (
              <AlertTriangle className="w-10 h-10 mb-4" />
            )}
            <h3 className="font-semibold text-lg mb-2">
              {isCancelled ? 'Scan Cancelled' : 'Scan Failed'}
            </h3>
            <p className="text-sm">{status.error || "An unknown error occurred during the scan."}</p>
            <Button variant="outline" className="mt-6" onClick={onCancel}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 animate-fade-in flex flex-col">
      {/* ── Scanning Header ── */}
      <div className="mb-8 space-y-1 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-500/50">Step 2 of 3</p>
        <h2 className="text-2xl font-mono font-bold text-white tracking-widest uppercase flex items-center justify-center gap-3">
          Scanning Ecosystem
          <RefreshCcw className="w-4 h-4 text-cyan-500 animate-spin" />
        </h2>
        <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest truncate">
          Target: {status?.currentUrl || "Initializing targets..."}
        </p>
      </div>

      <Card className="bg-[#0a0a0f] border-white/10 rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Left: Active Scan View */}
            <div className="p-6 md:p-8 flex flex-col lg:col-span-2">
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                 <div className="w-1.5 h-1.5 bg-cyan-500 animate-pulse" />
                 <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500">Live Visual Capture</span>
              </div>
              
              <div className="flex-1 relative border border-white/10 bg-black overflow-hidden group min-h-[400px]">
                {status?.latestScreenshots && status.latestScreenshots.length > 0 ? (
                  <>
                    <img 
                      src={`/api/screenshots/${encodeURIComponent(status.latestScreenshots[status.latestScreenshots.length - 1])}`} 
                      alt="Current Scan Target" 
                      className="w-full h-full object-cover opacity-80"
                    />
                    {/* Enhanced Scanning Sweep Animation Overlay */}
                    <div className="absolute left-0 w-full h-[30%] bg-gradient-to-b from-transparent to-cyan-500/30 animate-scan-vertical border-b-2 border-cyan-400 shadow-[0_5px_15px_rgba(6,182,212,0.6)] pointer-events-none z-10" />
                    <div className="absolute inset-0 bg-cyan-500/5 mix-blend-overlay animate-pulse pointer-events-none" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-white/20 text-xs uppercase tracking-widest">
                    Awaiting Target Connection...
                  </div>
                )}
              </div>
              
              {/* Optional: Snapshot History Tape */}
              {status?.latestScreenshots && status.latestScreenshots.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide shrink-0 animate-fade-in animate-in">
                   {status.latestScreenshots.slice(0, -1).reverse().map((file: string, i: number) => (
                      <div key={file} className="relative group shrink-0 border border-white/10 hover:border-cyan-500/50 transition-colors">
                        <img 
                          src={`/api/screenshots/${encodeURIComponent(file)}`} 
                          alt={`Snapshot ${i}`} 
                          className="w-24 h-14 object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                   ))}
                </div>
              )}
            </div>

            {/* Right: Progress Journey & Terminal */}
            <div className="flex flex-col border-white/5">
              {/* Overall Progress */}
              <div className="p-6 md:p-8 space-y-4 border-b border-white/5">
                <div className="flex justify-between items-end font-mono">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                      Progress
                    </p>
                    <p className="text-sm font-bold text-white uppercase tracking-widest">
                      {status?.currentStep || "Initializing"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400 tabular-nums">
                      {Math.round(progress)}%
                    </p>
                  </div>
                </div>
                
                <div className="h-6 w-full bg-black border border-white/10 p-1">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-pulse"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Journey Logic */}
              <div className="p-6 md:p-8 flex-1 border-b border-white/5">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                   <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                   <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500">Journey Progress</span>
                </div>
                <div className="space-y-6 relative font-mono text-xs">
                  {/* Vertical Progress Line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/10" />
                  
                  {steps.map((step: any, index: number) => (
                    <div key={index} className="flex gap-4 relative mix-blend-lighten">
                      <div className="bg-[#0a0a0f] z-10 py-0.5">
                          {step.status === 'completed' ? (
                            <CheckSquare className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                          ) : step.status === 'running' ? (
                            <RefreshCcw className="w-5 h-5 text-cyan-400 animate-spin" />
                          ) : step.status === 'failed' ? (
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                          ) : (
                            <Square className="w-5 h-5 text-white/20" />
                          )}
                      </div>
                      <div className="flex flex-col justify-center translate-y-[2px]">
                          <span className={cn(
                            "uppercase tracking-widest transition-colors duration-300",
                            step.status === 'completed' && "text-white/60",
                            step.status === 'running' && "text-cyan-400 font-bold",
                            step.status === 'failed' && "text-rose-500",
                            step.status === 'pending' && "text-white/20"
                          )}>
                            {step.label}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Terminal */}
              <div className="bg-black p-6 md:p-8 font-mono text-[9px] uppercase tracking-widest leading-relaxed flex-1">
                <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2 text-cyan-500/60">
                  <span className="animate-pulse">&gt;</span>
                  <span>System Output Stream</span>
                </div>
                <div className="space-y-1.5 h-[120px] overflow-auto scrollbar-hide">
                  <p className="text-white/20 italic">[$] Process initiated...</p>
                  <p className="text-cyan-500/40">&gt; Spawning engine nodes</p>
                  <p className="text-white/30">&gt; Target acquired: {status?.currentUrl || "Pending"}...</p>
                  {progress > 20 && <p className="text-emerald-500/50">&gt; SUCCESS: DOM snapshot captured</p>}
                  {progress > 50 && <p className="text-cyan-500/50">&gt; RUNNING: Cross-browser verification</p>}
                  {progress > 80 && <p className="text-amber-500/50">&gt; ANALYZING: Issue classifications running</p>}
                  {status?.status === 'running' && <p className="text-white animate-pulse mt-2">_</p>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-10 flex justify-center">
        <button
          className="px-8 py-3 border border-rose-500/30 text-rose-500/50 font-mono text-[10px] uppercase tracking-[0.3em] transition-all cyber-button-danger"
          onClick={() => cancelMutation.mutate({ jobId })}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? '[ Aborting Session... ]' : '[ Abort Scan Session ]'}
        </button>
      </div>
    </div>
  );
}
