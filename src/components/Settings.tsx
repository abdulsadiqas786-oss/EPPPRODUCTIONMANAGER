import { useState, useEffect, useCallback } from 'react';
import { supabase, type UserRole } from '@/lib/supabase';
import {
  Settings as SettingsIcon,
  UserPlus,
  Trash2,
  Pencil,
  Save,
  X,
  Shield,
  Eye,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type ManagedUser = {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
};

export default function Settings() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');

  // Edit form
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('viewer');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'list' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to load users');
    } else {
      setUsers(data.users as ManagedUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function callApi(body: Record<string, unknown>) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return data;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await callApi({ action: 'add', email: newEmail, password: newPassword, role: newRole });
      setShowAdd(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    try {
      const updates: Record<string, string> = { id, role: editRole };
      if (editEmail) updates.email = editEmail;
      if (editPassword) updates.password = editPassword;
      await callApi({ action: 'update', ...updates });
      setEditingId(null);
      setEditEmail('');
      setEditPassword('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setError(null);
    try {
      await callApi({ action: 'delete', id });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  function startEdit(u: ManagedUser) {
    setEditingId(u.id);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRole(u.role);
  }

  const field =
    'w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-blue-500';
  const label = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">
            Manage user accounts — add, edit, or remove login credentials
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users list */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900">User Accounts</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">{users.length} users registered</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          className="rounded border-0 bg-white px-2 py-1 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="font-medium">{u.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="rounded border-0 bg-white px-2 py-1 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <Eye className="h-3 w-3" /> Viewer
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex justify-end gap-1">
                        {editPassword === '' && (
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="New password (optional)"
                            className="mr-2 w-40 rounded border-0 bg-white px-2 py-1 text-xs ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                        <button
                          onClick={() => setEditPassword(prompt('Enter new password (leave blank to keep current):') ?? '')}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Change password"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdate(u.id)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditPassword('');
                          }}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
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

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-blue-50 p-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Add New User</h3>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className={label}>Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@epp.com"
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set a password"
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className={field}
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
