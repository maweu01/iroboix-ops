import React, { useState, useEffect } from "react";
import { Download, FileJson, FileText, Database, Printer, File, FileDown, X, History } from "lucide-react";
import { Button } from "../components/Button";
import { DashboardLayout } from "../components/layout";
import { getLocalData, putLocalData, Repair, ReportRecord } from "../services/db";
import { generatePDFReport, ReportMode } from "../services/pdfGenerator";
import { useAuth } from "../hooks/useAuth";

export default function ExportDashboard() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [reportsHistory, setReportsHistory] = useState<ReportRecord[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState("");
  const [reportMode, setReportMode] = useState<ReportMode>("standard");
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");

  const loadHistory = async () => {
    try {
      const history = await getLocalData<ReportRecord>("reports");
      setReportsHistory(history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.warn("Could not load reports history", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const triggerDownload = (content: string | Blob, filename: string, type?: string) => {
    let url: string;
    if (content instanceof Blob) {
      url = URL.createObjectURL(content);
    } else {
      const blob = new Blob([content], { type });
      url = URL.createObjectURL(blob);
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const dbRepairs = await getLocalData<Repair>("repairs");
      const inventory = await getLocalData("inventory");
      const fieldNotes = await getLocalData("fieldNotes");
      
      const payload = {
        exportedAt: new Date().toISOString(),
        repairs: dbRepairs,
        inventory,
        fieldNotes
      };
      
      triggerDownload(JSON.stringify(payload, null, 2), `irobotix-ops-export-${Date.now()}.json`, "application/json");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const dbRepairs = await getLocalData<Repair>("repairs");
      
      if (dbRepairs.length === 0) {
        alert("No repairs to export to CSV");
        return;
      }
      
      const headers = ["ID", "Title", "Status", "Client ID", "Device Model", "Created At"];
      const rows = dbRepairs.map(r => [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        r.status,
        `"${r.clientId.replace(/"/g, '""')}"`,
        `"${r.deviceModel.replace(/"/g, '""')}"`,
        r.createdAt
      ]);
      
      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      triggerDownload(csv, `repairs-export-${Date.now()}.csv`, "text/csv");
      
    } finally {
      setExporting(false);
    }
  };

  const openReportModal = async () => {
    const dbRepairs = await getLocalData<Repair>("repairs");
    setRepairs(dbRepairs);
    if (dbRepairs.length > 0) {
      setSelectedRepairId(dbRepairs[0].id);
    }
    setReportModalOpen(true);
    setPdfBlobUrl("");
  };

  const handleGeneratePDF = async () => {
    const repair = repairs.find(r => r.id === selectedRepairId);
    if (!repair) return;
    
    setExporting(true);
    try {
      const blob = await generatePDFReport(repair, reportMode, user?.email || 'Unknown User');
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result?.toString();
        if (base64data) {
          const reportRecord = {
            id: `report-${Date.now()}`,
            repairId: repair.id,
            mode: reportMode,
            pdfData: base64data,
            createdAt: new Date().toISOString(),
            synced: false
          };
          await putLocalData('reports', reportRecord);
          loadHistory();
        }
      };
      reader.readAsDataURL(blob);

    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = `maintenance-report-${selectedRepairId}-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPDF = () => {
    if (!pdfBlobUrl) return;
    const printWindow = window.open(pdfBlobUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 flex flex-col h-full relative">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Data Export Center</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Enterprise reporting and backups</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center text-center group hover:border-blue-500 transition-colors">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <FileJson className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Full System JSON</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Complete offline database snapshot including all modules, queue state, and metadata.</p>
            <Button className="w-full mt-auto" onClick={handleExportJSON} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" /> Export Backup
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center text-center group hover:border-green-500 transition-colors">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
              <Database className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Repair Logs CSV</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Tabular repair and maintenance data suitable for Excel and legacy enterprise systems.</p>
            <Button className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white" onClick={handleExportCSV} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center text-center group hover:border-indigo-500 transition-colors">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">PDF Operations Report</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Formal maintenance compliance report. Offline-first and self-contained.</p>
            <Button className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openReportModal}>
              <File className="mr-2 h-4 w-4" /> Generator
            </Button>
          </div>
        </div>

        {/* Previously Generated Reports */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">Previously Generated Reports</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            {reportsHistory.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No reports have been generated locally.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportsHistory.map(report => (
                  <div key={report.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {report.mode.toUpperCase()} REPORT
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-1">Ticket: {report.repairId}</div>
                      <div className="text-xs text-slate-400 mt-1">Generated: {new Date(report.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                       {report.pdfData && (
                         <>
                          <Button size="sm" variant="outline" onClick={() => {
                            const a = document.createElement("a");
                            a.href = report.pdfData!;
                            a.download = `maintenance-report-${report.repairId}-${new Date(report.createdAt).getTime()}.pdf`;
                            a.click();
                          }}>
                            <Download className="h-3 w-3 mr-1" /> Download
                          </Button>
                          <Button size="sm" onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<iframe width="100%" height="100%" src="${report.pdfData!}"></iframe>`);
                            }
                          }}>
                            <Printer className="h-3 w-3 mr-1" /> View
                          </Button>
                         </>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal for PDF Generation */}
        {reportModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg">Generate PDF Report</h3>
                <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-6">
                {!pdfBlobUrl ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Repair Ticket</label>
                      <select 
                        value={selectedRepairId} 
                        onChange={(e) => setSelectedRepairId(e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      >
                        {repairs.length === 0 && <option value="">No repairs available</option>}
                        {repairs.map(r => (
                          <option key={r.id} value={r.id}>{r.title} ({r.deviceModel}) - {r.status}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Report Mode</label>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input type="radio" name="reportMode" value="standard" checked={reportMode === "standard"} onChange={() => setReportMode("standard")} className="mt-1" />
                          <div>
                            <div className="font-medium text-sm">STANDARD REPORT</div>
                            <div className="text-xs text-slate-500">Basic repair summary and equipment details.</div>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input type="radio" name="reportMode" value="maintenance" checked={reportMode === "maintenance"} onChange={() => setReportMode("maintenance")} className="mt-1" />
                          <div>
                            <div className="font-medium text-sm">MAINTENANCE REPORT</div>
                            <div className="text-xs text-slate-500">Full technical breakdown, diagnostics, and notes.</div>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input type="radio" name="reportMode" value="compliance" checked={reportMode === "compliance"} onChange={() => setReportMode("compliance")} className="mt-1" />
                          <div>
                            <div className="font-medium text-sm">COMPLIANCE REPORT</div>
                            <div className="text-xs text-slate-500">Includes checklist, QR audit trail, and signature block.</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center">
                      <FileDown className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold">Report Generated Successfully</h3>
                    <p className="text-sm text-slate-500">Saved locally for offline access and ready for download.</p>
                    
                    <div className="flex gap-4 mt-6">
                      <Button onClick={handleDownloadPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Download className="h-4 w-4 mr-2" /> Download File
                      </Button>
                      <Button variant="outline" onClick={handlePrintPDF}>
                        <Printer className="h-4 w-4 mr-2" /> Print / View
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                {!pdfBlobUrl ? (
                  <>
                    <Button variant="ghost" onClick={() => setReportModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleGeneratePDF} disabled={exporting || repairs.length === 0}>
                      {exporting ? "Generating..." : "Generate PDF"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setReportModalOpen(false)}>Close</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
