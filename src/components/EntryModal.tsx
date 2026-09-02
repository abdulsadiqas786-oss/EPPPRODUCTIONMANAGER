import { useState } from 'react';
import { supabase, type Part, type EntryType } from '@/lib/supabase';
import { Save, AlertCircle, X, Factory, Building2, Ban, Truck, Boxes } from 'lucide-react';
import { monthKey, normalizeCategory } from '@/lib/monthly';

const CATEGORY_OPTIONS = ['CPD', 'Foshan Mat', '7330-30P Mat', 'Other'] as const;
const PART_CATEGORY_OPTIONS = ['CPD', 'Foshan Mat', '7330-30P Mat', 'Other'] as const;

type Props = {
  type: EntryType;
  parts: Part[];
  onClose: () => void;
  onSaved: () => void;
};

const config: Record<
  EntryType,
  { title: string; icon: typeof Factory; table: string; accent: string }
> = {
  production: { title: 'Production Entry (Migo 101)', icon: Factory, table: 'production_entries', accent: 'emerald' },
  sap: { title: 'SAP Production Entry', icon: Building2, table: 'sap_production_entries', accent: 'blue' },
  rejection: { title: 'Rejection Entry', icon: Ban, table: 'rejection_entries', accent: 'orange' },
  dispatch: { title: 'Dispatch Entry (Migo 313)', icon: Truck, table: 'dispatch_entries', accent: 'cyan' },
  opening: { title: 'Opening Stock Entry', icon: Boxes, table: 'opening_balances', accent: 'slate' },
};

export default function EntryModal({ type, parts, onClose, onSaved }: Props) {
  const cfg = config[type];
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectionStore, setRejectionStore] = useState('Scrap Store');
  const [category, setCategory] = useState<string>('CPD');
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const part = parts.find((p) => p.id === partId);

  // When part is selected, pre-fill category from the part's current category
  function handlePartChange(id: string) {
    setPartId(id);
    const p = parts.find((pp) => pp.id === id);
    if (p) {
      const norm = normalizeCategory(p.category);
      if (CATEGORY_OPTIONS.includes(norm as (typeof CATEGORY_OPTIONS)[number])) {
        setCategory(norm);
      } else {
        setCategory('__custom');
        setCustomCategory(p.category);
      }
    }
  }

  function getFinalCategory(): string {
    if (category === '__custom') return customCategory.trim() || 'Other';
    return category;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!partId || !part) {
      setError('Please select a part.');
      return;
    }
    if (qty < 0) {
      setError('Quantity must be zero or greater.');
      return;
    }
    setSaving(true);
    try {
      const finalCategory = getFinalCategory();

      if (type === 'production') {
        const { error: err } = await supabase.from(cfg.table).insert({
          part_id: part.id, part_no: part.part_no, qty_produced: qty, production_date: date, category: finalCategory,
        });
        if (err) throw err;
      } else if (type === 'sap') {
        const { error: err } = await supabase.from(cfg.table).insert({
          part_id: part.id, part_no: part.part_no, qty_produced: qty, production_date: date, category: finalCategory,
        });
        if (err) throw err;
      } else if (type === 'rejection') {
        const { error: err } = await supabase.from(cfg.table).insert({
          part_no: part.part_no, part_name: part.part_name, rejection_store: rejectionStore,
          rejection_date: date, qty, category: finalCategory,
        });
        if (err) throw err;
      } else if (type === 'dispatch') {
        const { error: err } = await supabase.from(cfg.table).insert({
          part_no: part.part_no, part_name: part.part_name, migo_type: '313', dispatch_date: date, qty, category: finalCategory,
        });
        if (err) throw err;
      } else if (type === 'opening') {
        const month = monthKey(date);
        const { data: existing } = await supabase
          .from('opening_balances')
          .select('id')
          .eq('part_no', part.part_no)
          .eq('month', month)
          .eq('category', finalCategory)
          .maybeSingle();
        if (existing) {
          const { error: err } = await supabase.from('opening_balances').update({ qty }).eq('id', existing.id);
          if (err) throw err;
        } else {
          const { error: err } = await supabase.from('opening_balances').insert({ part_no: part.part_no, month, qty, category: finalCategory });
          if (err) throw err;
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  const accentClasses: Record<string, { bg: string; text: string; btn: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', btn: 'bg-cyan-600 hover:bg-cyan-700' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', btn: 'bg-slate-700 hover:bg-slate-800' },
  };
  const ac = accentClasses[cfg.accent];
  const field = 'w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-sm font-medium text-slate-700 mb-1.5';

  const isOpening = type === 'opening';
  const isRejection = type === 'rejection';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${ac.bg}`}>
              <cfg.icon className={`h-5 w-5 ${ac.text}`} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{cfg.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={label}>Part</label>
            <select required value={partId} onChange={(e) => handlePartChange(e.target.value)} className={field}>
              <option value="">Select a part...</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.part_no} — {p.part_name} ({normalizeCategory(p.category)})
                </option>
              ))}
            </select>
            {parts.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">No parts available. Add parts first in Parts Master.</p>
            )}
          </div>

          {/* Category selector — shown for all entry types */}
          <div>
            <label className={label}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    category === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategory('__custom')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  category === '__custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                + Custom
              </button>
            </div>
            {category === '__custom' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Type a category name..."
                className="mt-2 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {part && (
              <p className="mt-1.5 text-xs text-slate-400">
                This entry will be recorded under category "{getFinalCategory()}".
              </p>
            )}
          </div>

          {isRejection && (
            <div>
              <label className={label}>Rejection Location</label>
              <select value={rejectionStore} onChange={(e) => setRejectionStore(e.target.value)} className={field}>
                <option value="Scrap Store">Scrap Store</option>
                <option value="Rejection Store">Rejection Store</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Quantity</label>
              <input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={field} />
            </div>
            <div>
              <label className={label}>{isOpening ? 'Month (from date)' : 'Date'}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              {isOpening && <p className="mt-1 text-xs text-slate-400">Opening stock applies to the month of the selected date.</p>}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || parts.length === 0}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${ac.btn}`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
