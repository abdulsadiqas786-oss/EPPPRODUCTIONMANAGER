import * as XLSX from 'xlsx';
import type {
  Part,
  ProductionEntry,
  SapProductionEntry,
  RejectionEntry,
  DispatchEntry,
  NewPart,
} from './supabase';

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function autoWidth(rows: Record<string, unknown>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((k) => ({
    wch: Math.max(
      k.length + 2,
      ...rows.map((r) => String(r[k] ?? '').length + 2)
    ),
  }));
}

export function exportPartsToExcel(parts: Part[]) {
  const rows = parts.map((p, i) => ({
    'Sr. No': i + 1,
    'Material Code': p.part_no,
    'Part Name': p.part_name,
    Qty: p.qty,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parts Master');
  downloadWorkbook(wb, 'Parts_Master_Report.xlsx');
}

export function exportProductionToExcel(
  entries: ProductionEntry[],
  parts: Part[]
) {
  const partMap = new Map(parts.map((p) => [p.part_no, p.part_name]));
  const rows = entries.map((e, i) => ({
    'Sr. No': i + 1,
    'Material Code': e.part_no,
    'Part Name': partMap.get(e.part_no) ?? '',
    'Migo 101': '101',
    Date: e.production_date,
    'Qty Produced': e.qty_produced,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Prod Report');
  downloadWorkbook(wb, 'Daily_Production_Report.xlsx');
}

export function exportSapProductionToExcel(
  entries: SapProductionEntry[],
  parts: Part[]
) {
  const partMap = new Map(parts.map((p) => [p.part_no, p.part_name]));
  const rows = entries.map((e, i) => ({
    'Sr. No': i + 1,
    'Material Code': e.part_no,
    'Part Name': partMap.get(e.part_no) ?? '',
    Date: e.production_date,
    'Qty Produced': e.qty_produced,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SAP Production Report');
  downloadWorkbook(wb, 'SAP_Production_Report.xlsx');
}

export function exportRejectionToExcel(entries: RejectionEntry[]) {
  const rows = entries.map((e, i) => ({
    'Sr. No': i + 1,
    'Material Code': e.part_no,
    'Part Name': e.part_name,
    'Rej': e.rejection_store,
    Date: e.rejection_date,
    Qty: e.qty,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Rejection Report');
  downloadWorkbook(wb, 'Daily_Rejection_Report.xlsx');
}

export function exportDispatchToExcel(entries: DispatchEntry[]) {
  const rows = entries.map((e, i) => ({
    'Sr. No': i + 1,
    'Material Code': e.part_no,
    'Part Name': e.part_name,
    'Migo 313': e.migo_type,
    Date: e.dispatch_date,
    Qty: e.qty,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Dispatch Report');
  downloadWorkbook(wb, 'Daily_Dispatch_Report.xlsx');
}

export function exportBalanceToExcel(
  parts: Part[],
  sapProduction: SapProductionEntry[],
  dispatches: DispatchEntry[],
  rejections: RejectionEntry[]
) {
  const sapMap = new Map<string, number>();
  for (const e of sapProduction) {
    sapMap.set(e.part_no, (sapMap.get(e.part_no) ?? 0) + e.qty_produced);
  }
  const dispMap = new Map<string, number>();
  for (const e of dispatches) {
    dispMap.set(e.part_no, (dispMap.get(e.part_no) ?? 0) + e.qty);
  }
  const rejMap = new Map<string, number>();
  for (const e of rejections) {
    rejMap.set(e.part_no, (rejMap.get(e.part_no) ?? 0) + e.qty);
  }

  const rows = parts.map((p, i) => {
    const sap = sapMap.get(p.part_no) ?? 0;
    const disp = dispMap.get(p.part_no) ?? 0;
    const rej = rejMap.get(p.part_no) ?? 0;
    const closing = Math.max(0, sap - rej - disp);
    return {
      'Sr. No': i + 1,
      'Material Code': p.part_no,
      'Part Name': p.part_name,
      'Opening Balance': 0,
      'SAP Production': sap,
      Rejected: rej,
      Dispatched: disp,
      'Closing Balance': closing,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Opening-Closing Balance');
  downloadWorkbook(wb, 'Opening_Closing_Balance_Report.xlsx');
}

export function exportTemplate(parts: Part[]) {
  const rows = parts.map((p) => ({
    Part_No: p.part_no,
    Part_Name: p.part_name,
    Qty: p.qty,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import_Ready_Parts_List');
  downloadWorkbook(wb, 'Import_Ready_Parts_List.xlsx');
}

type ParsedRow = {
  Part_No?: string;
  Part_Name?: string;
  Qty?: number | string;
};

export async function parsePartsExcel(file: File): Promise<NewPart[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' });

  const parts: NewPart[] = [];
  for (const row of rows) {
    const partNo = String(row.Part_No ?? '').trim();
    const partName = String(row.Part_Name ?? '').trim();
    if (!partNo || !partName) continue;
    parts.push({
      part_no: partNo,
      part_name: partName,
      qty: Number(row.Qty) || 0,
    });
  }
  return parts;
}
