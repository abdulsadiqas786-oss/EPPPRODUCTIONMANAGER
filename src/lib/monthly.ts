import type {
  Part,
  ProductionEntry,
  SapProductionEntry,
  RejectionEntry,
  DispatchEntry,
  MonthlyPlan,
  OpeningBalance,
  ClosingBalance,
} from './supabase';

/** YYYY-MM for a date string or Date */
export function monthKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns YYYY-MM for the month before the given key */
export function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns the date range (start, end inclusive) for week N of a given month key */
export function weekDateRange(month: string, weekNum: number): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0);
  const totalDays = lastDay.getDate();
  const weekSize = Math.ceil(totalDays / 4);
  const startDay = (weekNum - 1) * weekSize + 1;
  const endDay = Math.min(weekNum * weekSize, totalDays);
  const start = `${y}-${String(m).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start, end };
}

/** Check if a date falls within [start, end] inclusive */
export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** Normalize category — maps legacy "General" to "Other", blank to empty string */
export function normalizeCategory(cat: string): string {
  if (!cat) return '';
  if (cat === 'General') return 'Other';
  return cat;
}

/** Categories that should show as a named group in the sheet (in display order) */
export const SHEET_CATEGORIES = ['CPD', 'Foshan Mat', '7330-30P Mat'] as const;

export type MonthlyRow = {
  sr_no: number;
  part_no: string;
  part_name: string;
  category: string;
  opening: number;
  plan: number;
  production: number;
  sapProduction: number;
  sapTotal: number;
  rejection: number;
  rejectionPct: number;
  dispatch: number;
  closing: number;
  closingOverride: boolean;
};

/** Keep legacy exports for compatibility */
export const CATEGORY_ORDER = ['CPD', 'Foshan Mat', '7330-30P Mat', 'Other'];

/** Sort parts by category (in defined order), then by part_name */
export function sortPartsByCategory(parts: Part[]): Part[] {
  return [...parts].sort((a, b) => {
    const na = normalizeCategory(a.category);
    const nb = normalizeCategory(b.category);
    const ca = CATEGORY_ORDER.indexOf(na);
    const cb = CATEGORY_ORDER.indexOf(nb);
    const catA = ca === -1 ? CATEGORY_ORDER.length : ca;
    const catB = cb === -1 ? CATEGORY_ORDER.length : cb;
    if (catA !== catB) return catA - catB;
    return a.part_name.localeCompare(b.part_name);
  });
}

/** Collect all (part_no, category) pairs that have any activity in the given month */
function collectPartCategoryPairs(
  month: string,
  parts: Part[],
  production: ProductionEntry[],
  sapProduction: SapProductionEntry[],
  rejections: RejectionEntry[],
  dispatches: DispatchEntry[],
  plans: MonthlyPlan[],
  openingBalances: OpeningBalance[],
  closingBalances: ClosingBalance[]
): Map<string, string> {
  const pairs = new Map<string, string>(); // key: `${part_no}|||${category}` -> part_name
  const partNameMap = new Map(parts.map((p) => [p.part_no, p.part_name]));

  function add(partNo: string, category: string) {
    const cat = normalizeCategory(category) || 'Other';
    const key = `${partNo}|||${cat}`;
    if (!pairs.has(key)) {
      pairs.set(key, partNameMap.get(partNo) ?? partNo);
    }
  }

  for (const e of production) {
    if (monthKey(e.production_date) === month) add(e.part_no, e.category);
  }
  for (const e of sapProduction) {
    if (monthKey(e.production_date) === month) add(e.part_no, e.category);
  }
  for (const e of rejections) {
    if (monthKey(e.rejection_date) === month) add(e.part_no, e.category);
  }
  for (const e of dispatches) {
    if (monthKey(e.dispatch_date) === month) add(e.part_no, e.category);
  }
  for (const p of plans) {
    if (p.month === month) add(p.part_no, p.category);
  }
  for (const o of openingBalances) {
    if (o.month === month) add(o.part_no, o.category);
  }
  for (const c of closingBalances) {
    if (c.month === month) add(c.part_no, c.category);
  }

  // Always include all parts from the parts master, using their assigned category
  for (const p of parts) {
    add(p.part_no, p.category);
  }

  return pairs;
}

/**
 * Build the full monthly sheet for a given month.
 * Each (part, category) pair gets its own row. A part can appear under multiple
 * categories if it has entries with different categories.
 *
 * - Closing = (Opening + SAP) - Rejection - Dispatch, unless manual closing override.
 */
export function buildMonthlySheet(
  month: string,
  parts: Part[],
  production: ProductionEntry[],
  sapProduction: SapProductionEntry[],
  rejections: RejectionEntry[],
  dispatches: DispatchEntry[],
  plans: MonthlyPlan[],
  openingBalances: OpeningBalance[],
  closingBalances: ClosingBalance[]
): MonthlyRow[] {
  const pairs = collectPartCategoryPairs(
    month, parts, production, sapProduction, rejections, dispatches, plans, openingBalances, closingBalances
  );

  // Convert pairs to array and sort by category order, then part name
  const pairList = Array.from(pairs.entries()).map(([key, partName]) => {
    const [partNo, category] = key.split('|||');
    return { partNo, category, partName };
  });

  pairList.sort((a, b) => {
    const ca = SHEET_CATEGORIES.indexOf(a.category as (typeof SHEET_CATEGORIES)[number]);
    const cb = SHEET_CATEGORIES.indexOf(b.category as (typeof SHEET_CATEGORIES)[number]);
    const orderA = ca === -1 ? SHEET_CATEGORIES.length : ca;
    const orderB = cb === -1 ? SHEET_CATEGORIES.length : cb;
    if (orderA !== orderB) return orderA - orderB;
    return a.partName.localeCompare(b.partName);
  });

  return pairList.map((pair, idx) => {
    const { partNo, category, partName } = pair;

    const prodQty = production
      .filter((e) => e.part_no === partNo && normalizeCategory(e.category) === category && monthKey(e.production_date) === month)
      .reduce((s, e) => s + e.qty_produced, 0);
    const sapQty = sapProduction
      .filter((e) => e.part_no === partNo && normalizeCategory(e.category) === category && monthKey(e.production_date) === month)
      .reduce((s, e) => s + e.qty_produced, 0);
    const rejQty = rejections
      .filter((e) => e.part_no === partNo && normalizeCategory(e.category) === category && monthKey(e.rejection_date) === month)
      .reduce((s, e) => s + e.qty, 0);
    const dispQty = dispatches
      .filter((e) => e.part_no === partNo && normalizeCategory(e.category) === category && monthKey(e.dispatch_date) === month)
      .reduce((s, e) => s + e.qty, 0);

    const plan = plans.find(
      (p) => p.part_no === partNo && normalizeCategory(p.category) === category && p.month === month
    )?.plan_qty ?? 0;

    const manualOpening = openingBalances.find(
      (o) => o.part_no === partNo && normalizeCategory(o.category) === category && o.month === month
    )?.qty;

    let opening: number;
    if (manualOpening !== undefined) {
      opening = manualOpening;
    } else {
      opening = 0;
    }

    const sapTotal = opening + sapQty;

    const manualClosing = closingBalances.find(
      (c) => c.part_no === partNo && normalizeCategory(c.category) === category && c.month === month
    );
    const autoClosing = Math.max(0, sapTotal - rejQty - dispQty);
    const closing = manualClosing !== undefined ? manualClosing.qty : autoClosing;
    const closingOverride = manualClosing !== undefined;

    const rejectionPct = sapQty > 0 ? (rejQty / sapQty) * 100 : 0;

    return {
      sr_no: idx + 1,
      part_no: partNo,
      part_name: partName,
      category,
      opening,
      plan,
      production: prodQty,
      sapProduction: sapQty,
      sapTotal,
      rejection: rejQty,
      rejectionPct,
      dispatch: dispQty,
      closing,
      closingOverride,
    };
  });
}

/** Totals across all rows for a month */
export function monthlyTotals(rows: MonthlyRow[]) {
  const totals = {
    opening: rows.reduce((s, r) => s + r.opening, 0),
    plan: rows.reduce((s, r) => s + r.plan, 0),
    production: rows.reduce((s, r) => s + r.production, 0),
    sapProduction: rows.reduce((s, r) => s + r.sapProduction, 0),
    sapTotal: rows.reduce((s, r) => s + r.sapTotal, 0),
    rejection: rows.reduce((s, r) => s + r.rejection, 0),
    rejectionPct: 0,
    dispatch: rows.reduce((s, r) => s + r.dispatch, 0),
    closing: rows.reduce((s, r) => s + r.closing, 0),
  };
  totals.rejectionPct =
    totals.sapProduction > 0
      ? (totals.rejection / totals.sapProduction) * 100
      : 0;
  return totals;
}

/** Category-wise totals — only includes SHEET_CATEGORIES (no Other/blank) */
export type CategoryTotal = {
  category: string;
  parts: number;
  opening: number;
  plan: number;
  production: number;
  sapProduction: number;
  rejection: number;
  rejectionPct: number;
  dispatch: number;
  closing: number;
};

export function categoryTotals(rows: MonthlyRow[]): CategoryTotal[] {
  const catMap = new Map<string, MonthlyRow[]>();
  for (const r of rows) {
    if (!catMap.has(r.category)) catMap.set(r.category, []);
    catMap.get(r.category)!.push(r);
  }

  const result: CategoryTotal[] = [];
  for (const cat of SHEET_CATEGORIES) {
    const catRows = catMap.get(cat);
    if (!catRows || catRows.length === 0) continue;
    const t = monthlyTotals(catRows);
    result.push({
      category: cat,
      parts: catRows.length,
      opening: t.opening,
      plan: t.plan,
      production: t.production,
      sapProduction: t.sapProduction,
      rejection: t.rejection,
      rejectionPct: t.rejectionPct,
      dispatch: t.dispatch,
      closing: t.closing,
    });
  }
  return result;
}

/** Date-wise production status for a month */
export type DateStatus = {
  date: string;
  production: number;
  sap: number;
  rejection: number;
  dispatch: number;
  entries: number;
};

export function buildDateStatus(
  month: string,
  production: ProductionEntry[],
  sapProduction: SapProductionEntry[],
  rejections: RejectionEntry[],
  dispatches: DispatchEntry[]
): DateStatus[] {
  const dateMap = new Map<string, DateStatus>();

  function ensure(date: string): DateStatus {
    if (!dateMap.has(date)) {
      dateMap.set(date, { date, production: 0, sap: 0, rejection: 0, dispatch: 0, entries: 0 });
    }
    return dateMap.get(date)!;
  }

  for (const e of production) {
    if (monthKey(e.production_date) === month) {
      const s = ensure(e.production_date);
      s.production += e.qty_produced;
      s.entries += 1;
    }
  }
  for (const e of sapProduction) {
    if (monthKey(e.production_date) === month) {
      const s = ensure(e.production_date);
      s.sap += e.qty_produced;
      s.entries += 1;
    }
  }
  for (const e of rejections) {
    if (monthKey(e.rejection_date) === month) {
      const s = ensure(e.rejection_date);
      s.rejection += e.qty;
      s.entries += 1;
    }
  }
  for (const e of dispatches) {
    if (monthKey(e.dispatch_date) === month) {
      const s = ensure(e.dispatch_date);
      s.dispatch += e.qty;
      s.entries += 1;
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
