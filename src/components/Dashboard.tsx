import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Factory,
  Building2,
  Ban,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
} from 'lucide-react';
import type {
  Part,
  ProductionEntry,
  SapProductionEntry,
  RejectionEntry,
  DispatchEntry,
  MonthlyPlan,
  OpeningBalance,
  ClosingBalance,
  UserRole,
} from '@/lib/supabase';
import {
  buildMonthlySheet,
  monthlyTotals,
  categoryTotals,
  formatMonthLabel,
  monthKey,
  weekDateRange,
  dateInRange,
  normalizeCategory,
  SHEET_CATEGORIES,
  type MonthlyRow,
  type CategoryTotal,
} from '@/lib/monthly';

type Props = {
  parts: Part[];
  production: ProductionEntry[];
  sapProduction: SapProductionEntry[];
  rejections: RejectionEntry[];
  dispatches: DispatchEntry[];
  plans: MonthlyPlan[];
  openingBalances: OpeningBalance[];
  closingBalances: ClosingBalance[];
  loading: boolean;
  role: UserRole;
  month: string;
  onMonthChange: (m: string) => void;
};

type FilterMode = 'month' | 'week' | 'custom';

export function categoryColor(cat: string): string {
  const c = normalizeCategory(cat);
  switch (c) {
    case 'CPD': return 'bg-blue-100 text-blue-700';
    case 'Foshan Mat': return 'bg-emerald-100 text-emerald-700';
    case '7330-30P Mat': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-500';
  }
}

export default function Dashboard({
  parts,
  production,
  sapProduction,
  rejections,
  dispatches,
  plans,
  openingBalances,
  closingBalances,
  loading,
  month,
  onMonthChange,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // Applied filter state (updates only on Apply click)
  const [appliedFilter, setAppliedFilter] = useState<{
    mode: FilterMode;
    week: number;
    from: string;
    to: string;
  }>({ mode: 'month', week: 1, from: '', to: '' });

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function handleApply() {
    setAppliedFilter({
      mode: filterMode,
      week: selectedWeek,
      from: customFrom,
      to: customTo,
    });
  }

  // Compute date range from applied filter
  const dateRange = useMemo(() => {
    if (appliedFilter.mode === 'month') {
      return null; // whole month
    }
    if (appliedFilter.mode === 'week') {
      return weekDateRange(month, appliedFilter.week);
    }
    if (appliedFilter.mode === 'custom' && appliedFilter.from && appliedFilter.to) {
      return { start: appliedFilter.from, end: appliedFilter.to };
    }
    return null;
  }, [appliedFilter, month]);

  // Filter entries by date range
  const filteredProduction = useMemo(() => {
    if (!dateRange) return production.filter((e) => monthKey(e.production_date) === month);
    return production.filter((e) => dateInRange(e.production_date, dateRange.start, dateRange.end));
  }, [production, month, dateRange]);

  const filteredSapProduction = useMemo(() => {
    if (!dateRange) return sapProduction.filter((e) => monthKey(e.production_date) === month);
    return sapProduction.filter((e) => dateInRange(e.production_date, dateRange.start, dateRange.end));
  }, [sapProduction, month, dateRange]);

  const filteredRejections = useMemo(() => {
    if (!dateRange) return rejections.filter((e) => monthKey(e.rejection_date) === month);
    return rejections.filter((e) => dateInRange(e.rejection_date, dateRange.start, dateRange.end));
  }, [rejections, month, dateRange]);

  const filteredDispatches = useMemo(() => {
    if (!dateRange) return dispatches.filter((e) => monthKey(e.dispatch_date) === month);
    return dispatches.filter((e) => dateInRange(e.dispatch_date, dateRange.start, dateRange.end));
  }, [dispatches, month, dateRange]);

  const rows = buildMonthlySheet(
    month, parts, filteredProduction, filteredSapProduction,
    filteredRejections, filteredDispatches, plans, openingBalances, closingBalances
  );
  const totals = monthlyTotals(rows);
  const catTotals = categoryTotals(rows);
  const planAchievement = totals.plan > 0 ? (totals.production / totals.plan) * 100 : 0;

  // Group rows by category — exclude Foshan Mat from the sheet
  const groupedRows: { category: string; rows: MonthlyRow[]; total: CategoryTotal }[] = [];
  for (const ct of catTotals) {
    if (ct.category === 'Foshan Mat') continue;
    groupedRows.push({
      category: ct.category,
      rows: rows.filter((r) => normalizeCategory(r.category) === ct.category),
      total: ct,
    });
  }

  const filterLabel = dateRange
    ? appliedFilter.mode === 'week'
      ? `${formatMonthLabel(month)} — W${appliedFilter.week}`
      : `${appliedFilter.from} → ${appliedFilter.to}`
    : formatMonthLabel(month);

  return (
    <div className="space-y-6">
      {/* Title + Print */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">{filterLabel} — Complete production overview</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-lg font-bold">EPP Production Manager — {filterLabel}</h1>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 print:hidden">
        {/* Mode tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'month' as const, label: 'Month' },
            { id: 'week' as const, label: 'Week' },
            { id: 'custom' as const, label: 'Custom Date' },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterMode(m.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filterMode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Controls per mode */}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {/* Month selector — always visible */}
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg bg-white p-1.5 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">{formatMonthLabel(month)}</span>
            </div>
            <button onClick={() => shiftMonth(1)} className="rounded-lg bg-white p-1.5 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Week buttons */}
          {filterMode === 'week' && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    selectedWeek === w
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  W{w}
                </button>
              ))}
            </div>
          )}

          {/* Custom date pickers */}
          {filterMode === 'custom' && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-slate-500">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border-0 bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-slate-500">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border-0 bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={filterMode === 'custom' && (!customFrom || !customTo)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Apply
          </button>
        </div>

        {/* Active filter indicator */}
        {appliedFilter.mode !== 'month' && (
          <div className="mt-2 text-xs text-blue-600">
            Showing: {filterLabel}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:hidden">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <div className="absolute -right-8 -top-8 rounded-full bg-white/10 p-6">
            <Factory className="h-12 w-12" />
          </div>
          <div className="relative">
            <p className="text-sm font-medium text-emerald-50">Plan vs Production</p>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold">{loading ? '—' : totals.production}</p>
                <p className="text-xs text-emerald-100">Produced</p>
              </div>
              <div className="border-l border-white/30 pl-6">
                <p className="text-3xl font-bold text-emerald-100">{loading ? '—' : totals.plan}</p>
                <p className="text-xs text-emerald-100">Planned</p>
              </div>
            </div>
            {totals.plan > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-emerald-100">
                  <span>Achievement</span>
                  <span>{planAchievement.toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.min(100, planAchievement)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="absolute -right-8 -top-8 rounded-full bg-white/10 p-6">
            <Building2 className="h-12 w-12" />
          </div>
          <div className="relative">
            <p className="text-sm font-medium text-blue-50">SAP Production & Rejection</p>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold">{loading ? '—' : totals.sapProduction}</p>
                <p className="text-xs text-blue-100">SAP Produced</p>
              </div>
              <div className="border-l border-white/30 pl-6">
                <p className="text-3xl font-bold text-orange-200">{loading ? '—' : totals.rejection}</p>
                <p className="text-xs text-blue-100">Rejected</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5">
                <span className="text-sm font-semibold">{loading ? '—' : `${totals.rejectionPct.toFixed(1)}%`}</span>
                <span className="text-xs text-blue-100">Rejection Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:hidden">
        <MiniStat icon={ClipboardList} label="Total Plan" value={totals.plan} tint="bg-slate-100 text-slate-600" />
        <MiniStat icon={Factory} label="Total Production" value={totals.production} tint="bg-emerald-50 text-emerald-600" />
        <MiniStat icon={Truck} label="Total Dispatch" value={totals.dispatch} tint="bg-cyan-50 text-cyan-600" />
      </div>

      {/* Category-wise summary — only CPD and Foshan Mat */}
      {catTotals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
          {catTotals.filter(ct => ct.category === 'CPD').map((ct) => {
            const achieve = ct.plan > 0 ? (ct.production / ct.plan) * 100 : 0;
            const rejPct = ct.sapProduction > 0 ? (ct.rejection / ct.sapProduction) * 100 : 0;
            return (
              <div key={ct.category} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${categoryColor(ct.category)}`}>{ct.category}</span>
                  <span className="text-xs text-slate-400">{ct.parts} parts</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Production</span>
                    <span className="font-semibold text-emerald-700">{ct.production}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SAP Prod</span>
                    <span className="font-semibold text-blue-700">{ct.sapProduction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rejection</span>
                    <span className="font-semibold text-orange-700">{ct.rejection} ({rejPct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispatch</span>
                    <span className="font-semibold text-cyan-700">{ct.dispatch}</span>
                  </div>
                  {ct.plan > 0 && (
                    <div className="flex justify-between border-t border-slate-100 pt-1.5">
                      <span className="text-slate-500">Achievement</span>
                      <span className={`font-semibold ${achieve >= 100 ? 'text-emerald-600' : achieve >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{achieve.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main production sheet with category grouping */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <div className="border-b border-slate-200 px-5 py-4 print:hidden">
          <h3 className="font-semibold text-slate-900">Production Sheet — {filterLabel}</h3>
          <p className="mt-1 text-sm text-slate-500">Closing = (Opening + SAP) - Rejection - Dispatch</p>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-full divide-y divide-slate-200 print:text-[10px]">
            <thead className="bg-slate-50 print:bg-white">
              <tr>
                {['Sr', 'Part Name', 'Category', 'Opening', 'Plan', 'Production', 'SAP Prod', 'Rejection', 'Rej %', 'Dispatch', 'Closing'].map((h, i) => (
                  <th key={i} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">No parts available.</td></tr>
              )}
              {!loading && groupedRows.map((grp) => (
                <CategoryGroup key={grp.category || 'uncategorized'} group={grp} />
              ))}
              {/* Uncategorized rows (Other/blank) — no group header, just rows */}
              {!loading && rows.filter(r => !SHEET_CATEGORIES.includes(r.category as (typeof SHEET_CATEGORIES)[number]) && normalizeCategory(r.category) !== 'Foshan Mat').length > 0 && (
                <UncategorizedRows rows={rows.filter(r => !SHEET_CATEGORIES.includes(r.category as (typeof SHEET_CATEGORIES)[number]) && normalizeCategory(r.category) !== 'Foshan Mat')} />
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot className="bg-slate-100 print:bg-white">
                <tr className="font-bold text-slate-900">
                  <td className="px-2 py-3 text-sm" colSpan={3}>Grand Total</td>
                  <td className="px-2 py-3 text-center text-sm">{totals.opening}</td>
                  <td className="px-2 py-3 text-center text-sm">{totals.plan}</td>
                  <td className="px-2 py-3 text-center text-sm text-emerald-700">{totals.production}</td>
                  <td className="px-2 py-3 text-center text-sm text-blue-700">{totals.sapProduction}</td>
                  <td className="px-2 py-3 text-center text-sm text-orange-700">{totals.rejection}</td>
                  <td className="px-2 py-3 text-center text-sm text-orange-700">{totals.rejectionPct.toFixed(1)}%</td>
                  <td className="px-2 py-3 text-center text-sm text-cyan-700">{totals.dispatch}</td>
                  <td className="px-2 py-3 text-center text-sm">{totals.closing}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({ group }: { group: { category: string; rows: MonthlyRow[]; total: CategoryTotal } }) {
  const seenParts = new Set<string>();
  return (
    <>
      <tr className="bg-slate-50 print:bg-slate-50">
        <td colSpan={11} className="px-2 py-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${categoryColor(group.category)}`}>
            {group.category} ({group.total.parts} parts)
          </span>
        </td>
      </tr>
      {group.rows.map((r) => {
        const isFirstOfPart = !seenParts.has(r.part_no);
        seenParts.add(r.part_no);
        return (
        <tr key={`${r.part_no}-${r.category}`} className="transition hover:bg-slate-50 print:hover:bg-white">
          <td className="px-2 py-3 text-center text-sm text-slate-400">{isFirstOfPart ? r.sr_no : ''}</td>
          <td className="px-2 py-3 text-left text-sm font-medium text-slate-900 whitespace-nowrap">{isFirstOfPart ? r.part_name : ''}</td>
          <td className="px-2 py-3 text-center text-sm">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryColor(r.category)}`}>{r.category}</span>
          </td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.opening}</td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.plan > 0 ? r.plan : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-emerald-700">{r.production > 0 ? r.production : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-blue-700">{r.sapProduction > 0 ? r.sapProduction : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-orange-700">{r.rejection > 0 ? r.rejection : '-'}</td>
          <td className="px-2 py-3 text-center text-sm">
            {r.sapProduction > 0 ? (
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${r.rejectionPct > 5 ? 'bg-red-100 text-red-700' : r.rejectionPct > 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.rejectionPct.toFixed(1)}%</span>
            ) : <span className="text-slate-300">-</span>}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-cyan-700">{r.dispatch > 0 ? r.dispatch : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-bold text-slate-900">{r.closing}</td>
        </tr>
        );
      })}
      <tr className="bg-slate-50 font-semibold text-slate-700 print:bg-slate-50">
        <td className="px-2 py-2 text-sm" colSpan={3}>{group.category} Subtotal</td>
        <td className="px-2 py-2 text-center text-sm">{group.total.opening}</td>
        <td className="px-2 py-2 text-center text-sm">{group.total.plan}</td>
        <td className="px-2 py-2 text-center text-sm text-emerald-700">{group.total.production}</td>
        <td className="px-2 py-2 text-center text-sm text-blue-700">{group.total.sapProduction}</td>
        <td className="px-2 py-2 text-center text-sm text-orange-700">{group.total.rejection}</td>
        <td className="px-2 py-2 text-center text-sm text-orange-700">{group.total.rejectionPct.toFixed(1)}%</td>
        <td className="px-2 py-2 text-center text-sm text-cyan-700">{group.total.dispatch}</td>
        <td className="px-2 py-2 text-center text-sm">{group.total.closing}</td>
      </tr>
    </>
  );
}

function UncategorizedRows({ rows }: { rows: MonthlyRow[] }) {
  const seenParts = new Set<string>();
  return (
    <>
      {rows.map((r) => {
        const isFirstOfPart = !seenParts.has(r.part_no);
        seenParts.add(r.part_no);
        return (
        <tr key={`${r.part_no}-${r.category}`} className="transition hover:bg-slate-50 print:hover:bg-white">
          <td className="px-2 py-3 text-center text-sm text-slate-400">{isFirstOfPart ? r.sr_no : ''}</td>
          <td className="px-2 py-3 text-left text-sm font-medium text-slate-900 whitespace-nowrap">{isFirstOfPart ? r.part_name : ''}</td>
          <td className="px-2 py-3 text-center text-sm"></td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.opening}</td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.plan > 0 ? r.plan : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-emerald-700">{r.production > 0 ? r.production : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-blue-700">{r.sapProduction > 0 ? r.sapProduction : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-orange-700">{r.rejection > 0 ? r.rejection : '-'}</td>
          <td className="px-2 py-3 text-center text-sm">
            {r.sapProduction > 0 ? (
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${r.rejectionPct > 5 ? 'bg-red-100 text-red-700' : r.rejectionPct > 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.rejectionPct.toFixed(1)}%</span>
            ) : <span className="text-slate-300">-</span>}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-cyan-700">{r.dispatch > 0 ? r.dispatch : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-bold text-slate-900">{r.closing}</td>
        </tr>
        );
      })}
    </>
  );
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: typeof Factory; label: string; value: number; tint: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md print:hidden">
      <div className={`inline-flex rounded-lg p-2 ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
