import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import RepairsDashboard from "./pages/RepairsDashboard";
import InventoryDashboard from "./pages/InventoryDashboard";
import ClientsDashboard from "./pages/ClientsDashboard";
import FieldNotesDashboard from "./pages/FieldNotesDashboard";
import ExportDashboard from "./pages/ExportDashboard";
import { Cog } from "lucide-react";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Cog className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        
        {/* Core Modules */}
        <Route path="/" element={user ? <RepairsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/inventory" element={user ? <InventoryDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/clients" element={user ? <ClientsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/field-notes" element={user ? <FieldNotesDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/export" element={user ? <ExportDashboard /> : <Navigate to="/login" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
