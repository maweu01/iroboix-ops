import React from "react";

interface SyncProps {
  isOnline: boolean;
  hasPendingWrites: boolean;
}

export default function SyncStatusBar({ isOnline, hasPendingWrites }: SyncProps) {
  return (
    <div className="absolute top-16 right-4 z-[1000] pointer-events-none font-mono text-[10px] uppercase tracking-wider flex flex-col gap-1">
      {/* Network Connectivity Badge */}
      <div className={px-2.5 py-1 rounded shadow-md border flex items-center gap-1.5 backdrop-blur-md ${
        isOnline ? "bg-slate-900/90 text-teal-400 border-teal-500/30" : "bg-red-950/90 text-red-400 border-red-500/30"
      }}>
        <span className={w-1.5 h-1.5 rounded-full ${isOnline ? "bg-teal-400 animate-pulse" : "bg-red-500"}}></span>
        {isOnline ? "System Online" : "System Offline"}
      </div>

      {/* Cloud Ledger Write State Sync */}
      {hasPendingWrites && (
        <div className="bg-amber-950/90 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded shadow-md flex items-center gap-1.5 backdrop-blur-md animate-bounce">
          <span>⚙</span> Queued Local Logs Syncing...
        </div>
      )}
    </div>
  );
}