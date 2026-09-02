import { useState, useMemo } from 'react';
import {
  supabase,
  type Part,
  type ProductionEntry,
  type SapProductionEntry,
  type RejectionEntry,
  type DispatchEntry,
} from '@/lib/supabase';
import {
  FileSpreadsheet,
  Download,
  Package,
  Factory,
  AlertCircle,
  Trash2,
  Ban,
  Truck,
  Building2,
  Printer,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  exportPartsToExcel,
  exportProductionToExcel,
  exportSapProductionToExcel,
  exportRejectionToExcel,
  exportDispatchToExcel,
  exportBalanceToExcel,
} from '@/lib/excel';
import { monthKey, formatMonthLabel } from '@/lib/monthly';

type Props = {
  parts: Part[];
  production: ProductionEntry[];
  sapProduction: SapProductionEntry[];
  rejections: RejectionEntry[];
  dispatches: DispatchEntry[];
  onRefresh: () => void;
  isAdmin: boolean;
  month: string;
};

type ReportTab =
  | 'production'
  | 'sap'
  | 'rejection'
  | 'dispatch'
  | 'balance'
  | 'parts';

export default function Reports({
  parts,
  production,
  sapProduction,
  rejections,
  dispatches,
  onRefresh,
  isAdmin,
  month,
}: Props) {
  const [tab, setTab] = useState<ReportTab>('production');
  const [error, setError] = useState<string | null>(null);
  const [rejectionPartFilter, setRejectionPartFilter] = useState<string>('all');

  const tabs: { id: ReportTab; label: string; icon: typeof Factory }[] = [
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'sap', label: 'SAP Production', icon: Building2 },
    { id: 'rejection', label: 'Rejection', icon: Ban },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'balance', label: 'Opening/Closing', icon: FileSpreadsheet },
    { id: 'parts', label: 'Parts Master', icon: Package },
  ];

  // Filter all entries by the selected month (except parts master)
  const monthProduction = useMemo(
    () => production.filter((e) => monthKey(e.production_date) === month),
    [production, month]
  );
  const monthSapProduction = useMemo(
    () => sapProduction.filter((e) => monthKey(e.production_date) === month),
    [sapProduction, month]
  );
  const monthRejections = useMemo(
    () => rejections.filter((e) => monthKey(e.rejection_date) === month),
    [rejections, month]
  );
  const monthDispatches = useMemo(
    () => dispatches.filter((e) => monthKey(e.dispatch_date) === month),
    [dispatches, month]
  );

  async function handleDelete(table: string, id: string, partNo: string) {
    if (!confirm(`Delete entry for ${partNo}?`)) return;
    const { error: err } = await supabase.from(table).delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    onRefresh();
  }

  const partMap = new Map(parts.map((p) => [p.part_no, p.part_name]));

  function handleExport() {
    setError(null);
    try {
      switch (tab) {
        case 'production':
          exportProductionToExcel(monthProduction, parts);
          break;
        case 'sap':
          exportSapProductionToExcel(monthSapProduction, parts);
          break;
        case 'rejection':
          exportRejectionToExcel(monthRejections);
          break;
        case 'dispatch':
          exportDispatchToExcel(monthDispatches);
          break;
        case 'balance':
          exportBalanceToExcel(parts, monthSapProduction, monthDispatches, monthRejections);
          break;
        case 'parts':
          exportPartsToExcel(parts);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const exportDisabled =
    (tab === 'production' && monthProduction.length === 0) ||
    (tab === 'sap' && monthSapProduction.length === 0) ||
    (tab === 'rejection' && monthRejections.length === 0) ||
    (tab === 'dispatch' && monthDispatches.length === 0) ||
    (tab === 'parts' && parts.length === 0);

  function renderTable() {
    switch (tab) {
      case 'production':
        return (
          <ReportTable
            headers={['Sr. No', 'Part Name', 'Date', 'Qty', ...(isAdmin ? [''] : [])]}
            rows={monthProduction.map((e, i) => [
              <span key="sr">{i + 1}</span>,
              <span key="name">{partMap.get(e.part_no) ?? e.part_no}</span>,
              <span key="date">{e.production_date}</span>,
              <span key="qty" className="font-semibold text-emerald-700">{e.qty_produced}</span>,
              ...(isAdmin ? [<DeleteBtn key="del" onClick={() => handleDelete('production_entries', e.id, e.part_no)} />] : []),
            ])}
            emptyText={`No production entries for ${formatMonthLabel(month)}.`}
          />
        );
      case 'sap':
        return (
          <ReportTable
            headers={['Sr. No', 'Part Name', 'Date', 'Qty', ...(isAdmin ? [''] : [])]}
            rows={monthSapProduction.map((e, i) => [
              <span key="sr">{i + 1}</span>,
              <span key="name">{partMap.get(e.part_no) ?? e.part_no}</span>,
              <span key="date">{e.production_date}</span>,
              <span key="qty" className="font-semibold text-blue-700">{e.qty_produced}</span>,
              ...(isAdmin ? [<DeleteBtn key="del" onClick={() => handleDelete('sap_production_entries', e.id, e.part_no)} />] : []),
            ])}
            emptyText={`No SAP production entries for ${formatMonthLabel(month)}.`}
          />
        );
      case 'rejection':
        return (
          <RejectionReport
            rejections={monthRejections}
            isAdmin={isAdmin}
            onDelete={(id, partNo) => handleDelete('rejection_entries', id, partNo)}
            monthLabel={formatMonthLabel(month)}
            parts={parts}
            partFilter={rejectionPartFilter}
            onPartFilterChange={setRejectionPartFilter}
          />
        );
      case 'dispatch':
        return (
          <ReportTable
            headers={['Sr. No', 'Part Name', 'Date', 'Qty', ...(isAdmin ? [''] : [])]}
            rows={monthDispatches.map((e, i) => [
              <span key="sr">{i + 1}</span>,
              <span key="name">{e.part_name}</span>,
              <span key="date">{e.dispatch_date}</span>,
              <span key="qty" className="font-semibold text-cyan-700">{e.qty}</span>,
              ...(isAdmin ? [<DeleteBtn key="del" onClick={() => handleDelete('dispatch_entries', e.id, e.part_no)} />] : []),
            ])}
            emptyText={`No dispatch entries for ${formatMonthLabel(month)}.`}
          />
        );
      case 'balance':
        return (
          <BalanceTable
            parts={parts}
            sapProduction={monthSapProduction}
            dispatches={monthDispatches}
            rejections={monthRejections}
          />
        );
      case 'parts':
        return (
          <ReportTable
            headers={['Sr. No', 'Part Name', 'Qty']}
            rows={parts.map((p, i) => [
              <span key="sr">{i + 1}</span>,
              <span key="name">{p.part_name}</span>,
              <span key="qty" className={p.qty < 10 ? 'font-semibold text-red-600' : ''}>{p.qty}</span>,
            ])}
            emptyText="No parts in the system yet."
          />
        );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-500">
            Monthly reports — filtered by the selected month
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleExport}
            disabled={exportDisabled}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Month indicator */}
      <div className="flex items-center gap-2 print:hidden">
        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 ring-1 ring-blue-200">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">{formatMonthLabel(month)}</span>
        </div>
        <span className="text-sm text-slate-400">
          Change month from Dashboard or Monthly Sheet
        </span>
      </div>

      {/* Print-only header showing the month */}
      <div className="hidden print:block">
        <h1 className="text-lg font-bold">Reports — {formatMonthLabel(month)}</h1>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        {renderTable()}
      </div>
    </div>
  );
}

function BalanceTable({
  parts,
  sapProduction,
  dispatches,
  rejections,
}: {
  parts: Part[];
  sapProduction: SapProductionEntry[];
  dispatches: DispatchEntry[];
  rejections: RejectionEntry[];
}) {
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

  return (
    <ReportTable
      headers={['Sr. No', 'Part Name', 'Opening', 'SAP Prod', 'Rejected', 'Dispatched', 'Closing']}
      rows={parts.map((p, i) => {
        const sap = sapMap.get(p.part_no) ?? 0;
        const disp = dispMap.get(p.part_no) ?? 0;
        const rej = rejMap.get(p.part_no) ?? 0;
        const closing = sap - rej - disp;
        return [
          <span key="sr">{i + 1}</span>,
          <span key="name">{p.part_name}</span>,
          <span key="open">0</span>,
          <span key="sap" className="font-semibold text-blue-700">{sap}</span>,
          <span key="rej" className="font-semibold text-orange-700">{rej}</span>,
          <span key="disp" className="font-semibold text-cyan-700">{disp}</span>,
          <span key="close" className="font-bold text-slate-900">{Math.max(0, closing)}</span>,
        ];
      })}
      emptyText="No parts data available."
    />
  );
}

function ReportTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 print:bg-white">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-sm text-slate-400"
              >
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((cells, ri) => (
            <tr key={ri} className="transition hover:bg-slate-50 print:hover:bg-white">
              {cells.map((cell, ci) => (
                <td
                  key={ci}
                  className="whitespace-nowrap px-4 py-3 text-sm text-slate-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function RejectionReport({
  rejections,
  isAdmin,
  onDelete,
  monthLabel,
  parts,
  partFilter,
  onPartFilterChange,
}: {
  rejections: RejectionEntry[];
  isAdmin: boolean;
  onDelete: (id: string, partNo: string) => void;
  monthLabel: string;
  parts: Part[];
  partFilter: string;
  onPartFilterChange: (v: string) => void;
}) {
  const filteredRejections = useMemo(
    () => partFilter === 'all' ? rejections : rejections.filter((e) => e.part_no === partFilter),
    [rejections, partFilter]
  );

  const selectedPartName = useMemo(() => {
    if (partFilter === 'all') return null;
    return parts.find((p) => p.part_no === partFilter)?.part_name ?? partFilter;
  }, [parts, partFilter]);

  const scrapEntries = filteredRejections.filter((e) =>
    e.rejection_store.toLowerCase().includes('scrap')
  );
  const rejectionStoreEntries = filteredRejections.filter((e) =>
    e.rejection_store.toLowerCase().includes('rejection')
  );

  const scrapTotal = scrapEntries.reduce((s, e) => s + e.qty, 0);
  const rejStoreTotal = rejectionStoreEntries.reduce((s, e) => s + e.qty, 0);
  const grandTotal = scrapTotal + rejStoreTotal;

  const totalLabel = selectedPartName ? ` — ${selectedPartName}` : ' — All Parts';

  return (
    <div className="space-y-4 p-5">
      {/* Parts filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <label className="text-sm font-medium text-slate-600">Filter by Part:</label>
        </div>
        <select
          value={partFilter}
          onChange={(e) => onPartFilterChange(e.target.value)}
          className="max-w-xs rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Parts</option>
          {parts.map((p) => (
            <option key={p.part_no} value={p.part_no}>{p.part_name}</option>
          ))}
        </select>
      </div>

      {/* Summary by location */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-red-50 p-4 ring-1 ring-red-100">
          <p className="text-xs font-medium text-red-600">Scrap Store Total{totalLabel}</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{scrapTotal}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-100">
          <p className="text-xs font-medium text-orange-600">Rejection Store Total{totalLabel}</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">{rejStoreTotal}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-600">Combined Total{totalLabel}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{grandTotal}</p>
        </div>
      </div>

      {/* Combined table with location column */}
      <ReportTable
        headers={['Sr. No', 'Part Name', 'Location', 'Date', 'Qty', ...(isAdmin ? [''] : [])]}
        rows={filteredRejections.map((e, i) => [
          <span key="sr">{i + 1}</span>,
          <span key="name">{e.part_name}</span>,
          <span
            key="store"
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              e.rejection_store.toLowerCase().includes('scrap')
                ? 'bg-red-100 text-red-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {e.rejection_store}
          </span>,
          <span key="date">{e.rejection_date}</span>,
          <span key="qty" className="font-semibold text-orange-700">{e.qty}</span>,
          ...(isAdmin
            ? [<DeleteBtn key="del" onClick={() => onDelete(e.id, e.part_no)} />]
            : []),
        ])}
        emptyText={partFilter !== 'all' ? `No rejection entries for ${selectedPartName} in ${monthLabel}.` : `No rejection entries for ${monthLabel}.`}
      />
    </div>
  );
}
