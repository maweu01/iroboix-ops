import React from "react";
import { DashboardLayout } from "../components/layout";
import GisNotesExtended from "../components/GisNotesExtended";

export default function FieldNotesDashboard() {
  return (
    <DashboardLayout>
      {/* Inject the optimized real-time cross-platform map environment.
        This handles Nairobi default positioning, turf measurements, 
        offline syncing, and vector uploads cleanly inside your layout shell.
      */}
      <div className="w-full h-full min-h-[500px]">
        <GisNotesExtended />
      </div>
    </DashboardLayout>
  );
}