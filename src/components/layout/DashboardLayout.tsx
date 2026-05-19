import { Link, useLocation } from "react-router-dom";
import { LogOut, PenTool, Boxes, UserSquare2, Map, WifiOff, Database } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../Button";
import React, { useEffect, useState } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const navLinks = [
    { name: "Repairs", path: "/", icon: PenTool },
    { name: "Inventory", path: "/inventory", icon: Boxes },
    { name: "Clients", path: "/clients", icon: UserSquare2 },
    { name: "GIS Notes", path: "/field-notes", icon: Map },
    { name: "Data Export", path: "/export", icon: Database },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F1F5F9] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-200">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold tracking-tighter">
            RX
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">IROBOTIX <span className="text-blue-600">OPS</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-0">System Operations</p>
          </div>
        </div>
        
        <nav className="flex gap-4 sm:gap-8 text-sm font-medium">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link 
                key={link.path} 
                to={link.path}
                className={`flex items-center gap-2 pb-1 border-b-2 transition-colors ${isActive ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{link.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {!isOnline && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
              <WifiOff className="h-3 w-3" /> Offline
            </div>
          )}
          <span className="hidden lg:inline-block text-xs font-bold text-slate-500">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="h-10 w-10 p-0 rounded-full bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-600 hover:text-slate-900" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-y-auto w-full max-w-7xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
