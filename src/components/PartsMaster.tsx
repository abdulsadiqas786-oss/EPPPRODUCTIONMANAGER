import { useState } from 'react';
import { supabase, type Part, type NewPart, PART_CATEGORIES } from '@/lib/supabase';
import { normalizeCategory } from '@/lib/monthly';
import { exportTemplate, parsePartsExcel } from '@/lib/excel';
import {
  Search,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';

type Props = {
  parts: Part[];
  loading: boolean;
  onRefresh: () => void;
  isAdmin: boolean;
};

const emptyForm: NewPart = {
  part_no: '',
  part_name: '',
  category: 'CPD',
  qty: 0,
};

export default function PartsMaster({ parts, loading, onRefresh, isAdmin }: Props) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState<NewPart>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const filtered = parts.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.part_no.toLowerCase().includes(q) ||
      p.part_name.toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(part: Part) {
    setEditing(part);
    setForm({
      part_no: part.part_no,
      part_name: part.part_name,
      category: part.category || 'CPD',
      qty: part.qty,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { error: err } = await supabase
          .from('parts')
          .update({
            part_no: form.part_no,
            part_name: form.part_name,
            category: form.category,
            qty: Number(form.qty),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('parts').insert({
          part_no: form.part_no,
          part_name: form.part_name,
          category: form.category,
          qty: Number(form.qty),
        });
        if (err) throw err;
      }
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save part');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(part: Part) {
    if (!confirm(`Delete part "${part.part_name}" (${part.part_no})?`)) return;
    const { error: err } = await supabase.from('parts').delete().eq('id', part.id);
    if (err) {
      setError(err.message);
      return;
    }
    onRefresh();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const parsed = await parsePartsExcel(file);
      if (parsed.length === 0) {
        setImportMsg('No valid rows found in the file.');
      } else {
        const { error: err } = await supabase.from('parts').insert(parsed);
        if (err) throw err;
        setImportMsg(`Imported ${parsed.length} part(s) successfully.`);
        onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Parts Master</h2>
          <p className="text-sm text-slate-500">
            Manage your part catalog — {parts.length} total
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={() => exportTemplate(parts)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          </div>
        )}
      </div>

      {importMsg && (
        <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {importMsg}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by part number or name..."
          className="w-full rounded-lg border-0 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Part Name', 'Category', 'Qty', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Loading parts...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    {parts.length === 0
                      ? 'No parts yet. Add one or import from Excel.'
                      : 'No parts match your search.'}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {p.part_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        categoryColor(p.category)
                      }`}>
                        {normalizeCategory(p.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          p.qty < 10
                            ? 'font-semibold text-red-600'
                            : 'text-slate-700'
                        }
                      >
                        {p.qty}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <PartFormModal
          editing={editing}
          form={form}
          setForm={setForm}
          saving={saving}
          error={error}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

type ModalProps = {
  editing: Part | null;
  form: NewPart;
  setForm: React.Dispatch<React.SetStateAction<NewPart>>;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
};

function categoryColor(cat: string): string {
  switch (normalizeCategory(cat)) {
    case 'CPD': return 'bg-blue-100 text-blue-700';
    case 'Foshan Mat': return 'bg-emerald-100 text-emerald-700';
    case '7330-30P Mat': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function PartFormModal({
  editing,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSave,
}: ModalProps) {
  const field =
    'w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {editing ? 'Edit Part' : 'Add New Part'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className={label}>Part No</label>
            <input
              required
              value={form.part_no}
              onChange={(e) =>
                setForm({ ...form, part_no: e.target.value })
              }
              className={field}
              placeholder="e.g. 3000000683"
            />
          </div>
          <div>
            <label className={label}>Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className={field}
            >
              {PART_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={label}>Part Name</label>
            <input
              required
              value={form.part_name}
              onChange={(e) =>
                setForm({ ...form, part_name: e.target.value })
              }
              className={field}
              placeholder="e.g. ABSORB FR BUMPER ENERGY"
            />
          </div>
          <div>
            <label className={label}>Quantity</label>
            <input
              type="number"
              min={0}
              value={form.qty}
              onChange={(e) =>
                setForm({ ...form, qty: Number(e.target.value) })
              }
              className={field}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editing ? 'Update Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


