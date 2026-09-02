import { useMemo, useState } from 'react';
import {
  supabase,
  type Part,
  type ProductionEntry,
  type SapProductionEntry,
  type RejectionEntry,
  type DispatchEntry,
  type MonthlyPlan,
  type OpeningBalance,
  type ClosingBalance,
  type EntryType,
} from '@/lib/supabase';
import {
  buildMonthlySheet,
  monthlyTotals,
  categoryTotals,
  formatMonthLabel,
  normalizeCategory,
  SHEET_CATEGORIES,
  type MonthlyRow,
  type CategoryTotal,
} from '@/lib/monthly';
import EntryModal from '@/components/EntryModal';
import {
  Factory,
  Building2,
  Ban,
  Truck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ClipboardList,
  AlertCircle,
  Printer,
} from 'lucide-react';

function categoryColor(cat: string): string {
  switch (normalizeCategory(cat)) {
    case 'CPD': return 'bg-blue-100 text-blue-700';
    case 'Foshan Mat': return 'bg-emerald-100 text-emerald-700';
    case '7330-30P Mat': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

type Props = {
  parts: Part[];
  production: ProductionEntry[];
  sapProduction: SapProductionEntry[];
  rejections: RejectionEntry[];
  dispatches: DispatchEntry[];
  plans: MonthlyPlan[];
  openingBalances: OpeningBalance[];
  closingBalances: ClosingBalance[];
  onRefresh: () => void;
  isAdmin: boolean;
  month: string;
  onMonthChange: (m: string) => void;
};

export default function MonthlySheet({
  parts,
  production,
  sapProduction,
  rejections,
  dispatches,
  plans,
  openingBalances,
  closingBalances,
  onRefresh,
  isAdmin,
  month,
  onMonthChange,
}: Props) {
  const [modalType, setModalType] = useState<EntryType | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planInput, setPlanInput] = useState('');
  const [editingClosing, setEditingClosing] = useState<string | null>(null);
  const [closingInput, setClosingInput] = useState('');
  const [closingError, setClosingError] = useState<string | null>(null);

  const rows = useMemo(
    () => buildMonthlySheet(month, parts, production, sapProduction, rejections, dispatches, plans, openingBalances, closingBalances),
    [month, parts, production, sapProduction, rejections, dispatches, plans, openingBalances, closingBalances]
  );

  const totals = monthlyTotals(rows);
  const catTotals = categoryTotals(rows);

  // Group rows by category
  const groupedRows: { category: string; rows: MonthlyRow[]; total: CategoryTotal }[] = [];
  for (const ct of catTotals) {
    groupedRows.push({
      category: ct.category,
      rows: rows.filter((r) => normalizeCategory(r.category) === ct.category),
      total: ct,
    });
  }

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  async function savePlan(partNo: string, category: string) {
    const qty = Number(planInput);
    if (isNaN(qty) || qty < 0) { setPlanError('Please enter a valid quantity.'); return; }
    setPlanError(null);
    const existing = plans.find((p) => p.part_no === partNo && normalizeCategory(p.category) === category && p.month === month);
    try {
      if (existing) {
        const { error: err } = await supabase.from('monthly_plans').update({ plan_qty: qty }).eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('monthly_plans').insert({ part_no: partNo, month, plan_qty: qty, category });
        if (err) throw err;
      }
      setEditingPlan(null); setPlanInput(''); onRefresh();
    } catch (err) { setPlanError(err instanceof Error ? err.message : 'Failed to save plan'); }
  }

  function startEditPlan(partNo: string, current: number) {
    setEditingPlan(`${partNo}|||${current}`); setPlanInput(String(current));
  }

  async function saveClosing(partNo: string, category: string) {
    const qty = Number(closingInput);
    if (isNaN(qty) || qty < 0) { setClosingError('Please enter a valid quantity.'); return; }
    setClosingError(null);
    const existing = closingBalances.find((c) => c.part_no === partNo && normalizeCategory(c.category) === category && c.month === month);
    try {
      if (existing) {
        const { error: err } = await supabase.from('closing_balances').update({ qty }).eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('closing_balances').insert({ part_no: partNo, month, qty, category });
        if (err) throw err;
      }
      setEditingClosing(null); setClosingInput(''); onRefresh();
    } catch (err) { setClosingError(err instanceof Error ? err.message : 'Failed to save closing'); }
  }

  function startEditClosing(partNo: string, current: number) {
    setEditingClosing(`${partNo}|||${current}`); setClosingInput(String(current));
  }

  const quickButtons: { type: EntryType; label: string; icon: typeof Factory; accent: string }[] = [
    { type: 'production', label: 'Production', icon: Factory, accent: 'emerald' },
    { type: 'sap', label: 'SAP Production', icon: Building2, accent: 'blue' },
    { type: 'rejection', label: 'Rejection', icon: Ban, accent: 'orange' },
    { type: 'dispatch', label: 'Dispatch', icon: Truck, accent: 'cyan' },
  ];

  const accentMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200 hover:bg-cyan-100',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Monthly Production Sheet</h2>
          <p className="text-sm text-slate-500">Production, SAP, Rejection, Dispatch & Closing per part — grouped by category</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg bg-white p-2 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 ring-1 ring-slate-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{formatMonthLabel(month)}</span>
          </div>
          <button onClick={() => shiftMonth(1)} className="rounded-lg bg-white p-2 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {quickButtons.map((b) => (
            <button key={b.type} onClick={() => setModalType(b.type)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ring-1 transition ${accentMap[b.accent]}`}>
              <Plus className="h-4 w-4" /> {b.label}
            </button>
          ))}
        </div>
      )}

      {planError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200 print:hidden">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{planError}</span>
        </div>
      )}
      {closingError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200 print:hidden">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{closingError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <SummaryCard icon={ClipboardList} label="Plan" value={totals.plan} accent="slate" />
        <SummaryCard icon={Factory} label="Production" value={totals.production} accent="emerald" />
        <SummaryCard icon={Building2} label="SAP Prod" value={totals.sapProduction} accent="blue" />
        <SummaryCard icon={Ban} label="Rejection" value={totals.rejection} sub={`${totals.rejectionPct.toFixed(1)}%`} accent="orange" />
      </div>

      {/* Category summary cards — only CPD and Foshan Mat */}
      {catTotals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
          {catTotals.filter(ct => ct.category === 'CPD' || ct.category === 'Foshan Mat').map((ct) => {
            const rejPct = ct.sapProduction > 0 ? (ct.rejection / ct.sapProduction) * 100 : 0;
            return (
              <div key={ct.category} className="rounded-lg bg-white p-3.5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${categoryColor(ct.category)}`}>{ct.category}</span>
                  <span className="text-xs text-slate-400">{ct.parts} parts</span>
                </div>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Prod</span><span className="font-semibold text-emerald-700">{ct.production}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SAP</span><span className="font-semibold text-blue-700">{ct.sapProduction}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Rej</span><span className="font-semibold text-orange-700">{ct.rejection} ({rejPct.toFixed(1)}%)</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main sheet with category grouping */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
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
              {parts.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">No parts available. Add parts in Parts Master first.</td></tr>
              )}
              {groupedRows.map((grp) => (
                <CategoryGroup
                  key={grp.category}
                  group={grp}
                  isAdmin={isAdmin}
                  editingPlan={editingPlan}
                  planInput={planInput}
                  setPlanInput={setPlanInput}
                  savePlan={savePlan}
                  startEditPlan={startEditPlan}
                  editingClosing={editingClosing}
                  closingInput={closingInput}
                  setClosingInput={setClosingInput}
                  saveClosing={saveClosing}
                  startEditClosing={startEditClosing}
                />
              ))}
              {/* Uncategorized rows (Other/blank) — no group header */}
              {rows.filter(r => !SHEET_CATEGORIES.includes(r.category as (typeof SHEET_CATEGORIES)[number])).length > 0 && (
                <UncategorizedRows
                  rows={rows.filter(r => !SHEET_CATEGORIES.includes(r.category as (typeof SHEET_CATEGORIES)[number]))}
                  isAdmin={isAdmin}
                  editingPlan={editingPlan}
                  planInput={planInput}
                  setPlanInput={setPlanInput}
                  savePlan={savePlan}
                  startEditPlan={startEditPlan}
                  editingClosing={editingClosing}
                  closingInput={closingInput}
                  setClosingInput={setClosingInput}
                  saveClosing={saveClosing}
                  startEditClosing={startEditClosing}
                />
              )}
            </tbody>
            {rows.length > 0 && (
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

      {modalType && (
        <EntryModal type={modalType} parts={parts} onClose={() => setModalType(null)} onSaved={onRefresh} />
      )}
    </div>
  );
}

function CategoryGroup({
  group,
  isAdmin,
  editingPlan,
  planInput,
  setPlanInput,
  savePlan,
  startEditPlan,
  editingClosing,
  closingInput,
  setClosingInput,
  saveClosing,
  startEditClosing,
}: {
  group: { category: string; rows: MonthlyRow[]; total: CategoryTotal };
  isAdmin: boolean;
  editingPlan: string | null;
  planInput: string;
  setPlanInput: (v: string) => void;
  savePlan: (partNo: string, category: string) => void;
  startEditPlan: (partNo: string, current: number) => void;
  editingClosing: string | null;
  closingInput: string;
  setClosingInput: (v: string) => void;
  saveClosing: (partNo: string, category: string) => void;
  startEditClosing: (partNo: string, current: number) => void;
}) {
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
        const editKey = `${r.part_no}|||${r.plan}`;
        const closeKey = `${r.part_no}|||${r.closing}`;
        return (
        <tr key={`${r.part_no}-${r.category}`} className="transition hover:bg-slate-50 print:hover:bg-white">
          <td className="px-2 py-3 text-center text-sm text-slate-400">{r.sr_no}</td>
          <td className="px-2 py-3 text-left text-sm font-medium text-slate-900 whitespace-nowrap">{r.part_name}</td>
          <td className="px-2 py-3 text-center text-sm">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryColor(r.category)}`}>{r.category}</span>
          </td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.opening}</td>
          <td className="px-2 py-3 text-center text-sm">
            {editingPlan === editKey ? (
              <div className="flex items-center justify-center gap-1">
                <input type="number" min={0} value={planInput} onChange={(e) => setPlanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') savePlan(r.part_no, r.category); if (e.key === 'Escape') { setEditingPlan(null); setPlanInput(''); } }}
                  className="w-16 rounded border-0 bg-white px-2 py-1 text-center text-sm ring-1 ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                <button onClick={() => savePlan(r.part_no, r.category)} className="text-xs font-medium text-blue-600 hover:text-blue-700">OK</button>
              </div>
            ) : isAdmin ? (
              <button onClick={() => startEditPlan(r.part_no, r.plan)}
                className={`rounded px-2 py-0.5 text-sm transition hover:bg-slate-100 ${r.plan > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                {r.plan > 0 ? r.plan : '—'}
              </button>
            ) : (
              <span className={r.plan > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>{r.plan > 0 ? r.plan : '—'}</span>
            )}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-emerald-700">{r.production > 0 ? r.production : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-blue-700">{r.sapProduction > 0 ? r.sapProduction : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-orange-700">{r.rejection > 0 ? r.rejection : '-'}</td>
          <td className="px-2 py-3 text-center text-sm">
            {r.sapProduction > 0 ? (
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                r.rejectionPct > 5 ? 'bg-red-100 text-red-700' : r.rejectionPct > 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>{r.rejectionPct.toFixed(1)}%</span>
            ) : <span className="text-slate-300">-</span>}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-cyan-700">{r.dispatch > 0 ? r.dispatch : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-bold text-slate-900">
            {editingClosing === closeKey ? (
              <div className="flex items-center justify-center gap-1">
                <input type="number" min={0} value={closingInput} onChange={(e) => setClosingInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveClosing(r.part_no, r.category); if (e.key === 'Escape') { setEditingClosing(null); setClosingInput(''); } }}
                  className="w-16 rounded border-0 bg-white px-2 py-1 text-center text-sm ring-1 ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                <button onClick={() => saveClosing(r.part_no, r.category)} className="text-xs font-medium text-blue-600 hover:text-blue-700">OK</button>
              </div>
            ) : isAdmin ? (
              <button onClick={() => startEditClosing(r.part_no, r.closing)}
                className={`rounded px-2 py-0.5 text-sm transition hover:bg-slate-100 ${r.closingOverride ? 'text-blue-700 underline' : 'text-slate-900'}`}>
                {r.closing}
              </button>
            ) : (
              <span>{r.closing}</span>
            )}
          </td>
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

function UncategorizedRows({
  rows,
  isAdmin,
  editingPlan,
  planInput,
  setPlanInput,
  savePlan,
  startEditPlan,
  editingClosing,
  closingInput,
  setClosingInput,
  saveClosing,
  startEditClosing,
}: {
  rows: MonthlyRow[];
  isAdmin: boolean;
  editingPlan: string | null;
  planInput: string;
  setPlanInput: (v: string) => void;
  savePlan: (partNo: string, category: string) => void;
  startEditPlan: (partNo: string, current: number) => void;
  editingClosing: string | null;
  closingInput: string;
  setClosingInput: (v: string) => void;
  saveClosing: (partNo: string, category: string) => void;
  startEditClosing: (partNo: string, current: number) => void;
}) {
  return (
    <>
      {rows.map((r) => {
        const editKey = `${r.part_no}|||${r.plan}`;
        const closeKey = `${r.part_no}|||${r.closing}`;
        return (
        <tr key={`${r.part_no}-${r.category}`} className="transition hover:bg-slate-50 print:hover:bg-white">
          <td className="px-2 py-3 text-center text-sm text-slate-400">{r.sr_no}</td>
          <td className="px-2 py-3 text-left text-sm font-medium text-slate-900 whitespace-nowrap">{r.part_name}</td>
          <td className="px-2 py-3 text-center text-sm"></td>
          <td className="px-2 py-3 text-center text-sm text-slate-600">{r.opening}</td>
          <td className="px-2 py-3 text-center text-sm">
            {editingPlan === editKey ? (
              <div className="flex items-center justify-center gap-1">
                <input type="number" min={0} value={planInput} onChange={(e) => setPlanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') savePlan(r.part_no, r.category); if (e.key === 'Escape') { setEditingPlan(null); setPlanInput(''); } }}
                  className="w-16 rounded border-0 bg-white px-2 py-1 text-center text-sm ring-1 ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                <button onClick={() => savePlan(r.part_no, r.category)} className="text-xs font-medium text-blue-600 hover:text-blue-700">OK</button>
              </div>
            ) : isAdmin ? (
              <button onClick={() => startEditPlan(r.part_no, r.plan)}
                className={`rounded px-2 py-0.5 text-sm transition hover:bg-slate-100 ${r.plan > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                {r.plan > 0 ? r.plan : '—'}
              </button>
            ) : (
              <span className={r.plan > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>{r.plan > 0 ? r.plan : '—'}</span>
            )}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-emerald-700">{r.production > 0 ? r.production : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-blue-700">{r.sapProduction > 0 ? r.sapProduction : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-medium text-orange-700">{r.rejection > 0 ? r.rejection : '-'}</td>
          <td className="px-2 py-3 text-center text-sm">
            {r.sapProduction > 0 ? (
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                r.rejectionPct > 5 ? 'bg-red-100 text-red-700' : r.rejectionPct > 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>{r.rejectionPct.toFixed(1)}%</span>
            ) : <span className="text-slate-300">-</span>}
          </td>
          <td className="px-2 py-3 text-center text-sm font-medium text-cyan-700">{r.dispatch > 0 ? r.dispatch : '-'}</td>
          <td className="px-2 py-3 text-center text-sm font-bold text-slate-900">
            {editingClosing === closeKey ? (
              <div className="flex items-center justify-center gap-1">
                <input type="number" min={0} value={closingInput} onChange={(e) => setClosingInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveClosing(r.part_no, r.category); if (e.key === 'Escape') { setEditingClosing(null); setClosingInput(''); } }}
                  className="w-16 rounded border-0 bg-white px-2 py-1 text-center text-sm ring-1 ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                <button onClick={() => saveClosing(r.part_no, r.category)} className="text-xs font-medium text-blue-600 hover:text-blue-700">OK</button>
              </div>
            ) : isAdmin ? (
              <button onClick={() => startEditClosing(r.part_no, r.closing)}
                className={`rounded px-2 py-0.5 text-sm transition hover:bg-slate-100 ${r.closingOverride ? 'text-blue-700 underline' : 'text-slate-900'}`}>
                {r.closing}
              </button>
            ) : (
              <span>{r.closing}</span>
            )}
          </td>
        </tr>
        );
      })}
    </>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Factory; label: string; value: number; sub?: string; accent: 'slate' | 'emerald' | 'blue' | 'orange';
}) {
  const styles: Record<string, { bg: string; text: string }> = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  };
  const s = styles[accent];
  return (
    <div className="rounded-lg bg-white p-3.5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${s.bg}`}><Icon className={`h-4 w-4 ${s.text}`} /></div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className={`text-xs font-semibold ${s.text}`}>{sub}</p>}
    </div>
  );
}
