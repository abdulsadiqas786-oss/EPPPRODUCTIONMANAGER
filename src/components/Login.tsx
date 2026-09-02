import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Boxes, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-600/30">
            <Boxes className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">EPP Production Manager</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to access the production tracking system
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@epp.com"
                className="w-full rounded-lg border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
            <p className="mb-2 font-semibold text-slate-600">Demo Credentials:</p>
            <div className="space-y-1">
              <p><span className="font-medium text-slate-700">Admin:</span> admin@epp.com / Admin@123</p>
              <p><span className="font-medium text-slate-700">Viewer 1:</span> viewer1@epp.com / Viewer1@123</p>
              <p><span className="font-medium text-slate-700">Viewer 2:</span> viewer2@epp.com / Viewer2@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
