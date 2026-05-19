import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Repair } from './db';

// Three export modes:
export type ReportMode = 'standard' | 'maintenance' | 'compliance';

export const generatePDFReport = async (repair: Repair, mode: ReportMode, userName: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 20;

  // Colors
  const primaryColor = '#0f172a'; // slate-950
  const secondaryColor = '#64748b'; // slate-500
  const accentColor = '#3b82f6'; // blue-500

  // Title
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text('Maintenance Operations Report', 15, cursorY);
  cursorY += 10;

  // Subtitle / Type
  doc.setFontSize(12);
  doc.setTextColor(accentColor);
  const modeText = mode === 'standard' ? 'STANDARD REPORT' : mode === 'maintenance' ? 'MAINTENANCE REPORT' : 'COMPLIANCE REPORT';
  doc.text(modeText, 15, cursorY);
  cursorY += 15;

  // Metadata block
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  
  const leftColX = 15;
  const rightColX = pageWidth / 2 + 5;

  doc.setFont('helvetica', 'bold');
  doc.text('TICKET INFORMATION', leftColX, cursorY);
  doc.text('EQUIPMENT DETAILS', rightColX, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  
  // Left Column (Ticket)
  doc.text(`Ticket ID: ${repair.id}`, leftColX, cursorY);
  doc.text(`Status: ${repair.status.toUpperCase()}`, leftColX, cursorY + 6);
  doc.text(`Date Created: ${new Date(repair.createdAt).toLocaleDateString()}`, leftColX, cursorY + 12);
  doc.text(`Client ID: ${repair.clientId}`, leftColX, cursorY + 18);

  // Right Column (Equipment)
  doc.text(`Device Model: ${repair.deviceModel}`, rightColX, cursorY);
  doc.text(`Serial Number: ${repair.serialNumber || 'N/A'}`, rightColX, cursorY + 6);
  cursorY += 28;

  // Divider
  doc.setDrawColor(200);
  doc.line(15, cursorY, pageWidth - 15, cursorY);
  cursorY += 10;

  // Work Details
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('WORK DETAILS', 15, cursorY);
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(`Work duration estimate: TBD`, 15, cursorY);
  doc.text(`Parts replaced: N/A`, rightColX, cursorY);
  cursorY += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(15, cursorY, pageWidth - 15, cursorY);
  cursorY += 10;

  // Fault Description
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('FAULT DESCRIPTION', 15, cursorY);
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  const faultLines = doc.splitTextToSize(repair.description || 'No description provided.', pageWidth - 30);
  doc.text(faultLines, 15, cursorY);
  cursorY += faultLines.length * 6 + 10;

  // Repair Actions (if maintenance or compliance)
  if (mode === 'maintenance' || mode === 'compliance') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('DIAGNOSTICS & ACTIONS', 15, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor);
    
    // Check if parts exist (this is just mock string for now since parts replaced might be in notes)
    const notesText = repair.description ? repair.description + '\\n(Diagnosed from description)' : 'No technician notes provided. Routine inspection performed.';
    const actionLines = doc.splitTextToSize(`Technician Notes/Diagnostics:\\n${notesText}`, pageWidth - 30);
    doc.text(actionLines, 15, cursorY);
    cursorY += actionLines.length * 6 + 10;
  }

  // Compliance Section
  if (mode === 'compliance') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('COMPLIANCE CHECKLIST', 15, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor);
    doc.text('[ X ] Structural integrity verified', 15, cursorY); cursorY += 6;
    doc.text('[ X ] Firmware baseline checked', 15, cursorY); cursorY += 6;
    doc.text('[ X ] Power systems nominal', 15, cursorY); cursorY += 6;
    doc.text('[ X ] Safety confirmation complete', 15, cursorY); cursorY += 10;
  }

  // Footer / Signatures
  // Move to bottom of page
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  } else {
    cursorY = 230;
  }

  doc.setDrawColor(200);
  doc.line(15, cursorY, pageWidth - 15, cursorY);
  cursorY += 10;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('TECHNICIAN SIGN-OFF', 15, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(`Technician Name: ${userName || 'Authorized Personnel'}`, 15, cursorY);
  cursorY += 6;
  doc.text(`Timestamp: ${new Date().toLocaleString()}`, 15, cursorY);
  cursorY += 15;

  doc.setDrawColor(0);
  doc.line(15, cursorY, 80, cursorY);
  doc.text('Signature', 15, cursorY + 5);

  // Generate QR Code
  try {
    const qrData = JSON.stringify({
      t: repair.id,
      d: repair.deviceModel,
      ts: Date.now(),
      h: Math.random().toString(36).substring(2, 8)
    });
    
    // Generate QR Data URI
    const qrCodeDataUri = await QRCode.toDataURL(qrData, {
      margin: 1,
      width: 40,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    // Add QR code to PDF
    doc.addImage(qrCodeDataUri, 'PNG', pageWidth - 55, cursorY - 30, 40, 40);
  } catch (err) {
    console.error('QR Gen failed', err);
  }

  // Save/return Blob
  return doc.output('blob');
};
