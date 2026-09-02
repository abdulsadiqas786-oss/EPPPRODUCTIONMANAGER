import { useEffect, useState, useCallback } from 'react';
import {
  supabase,
  fetchUserRole,
  type Part,
  type ProductionEntry,
  type SapProductionEntry,
  type RejectionEntry,
  type DispatchEntry,
  type MonthlyPlan,
  type OpeningBalance,
  type ClosingBalance,
  type UserRole,
} from '@/lib/supabase';
import { monthKey } from '@/lib/monthly';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import PartsMaster from '@/components/PartsMaster';
import MonthlySheet from '@/components/MonthlySheet';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  FileBarChart,
  Settings as SettingsIcon,
  Boxes,
  Menu,
  X,
  LogOut,
  Shield,
  Eye,
} from 'lucide-react';

type View = 'dashboard' | 'parts' | 'monthly' | 'reports' | 'settings';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'parts', label: 'Parts Master', icon: Package },
  { id: 'monthly', label: 'Monthly Sheet', icon: CalendarDays },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
];

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [parts, setParts] = useState<Part[]>([]);
  const [production, setProduction] = useState<ProductionEntry[]>([]);
  const [sapProduction, setSapProduction] = useState<SapProductionEntry[]>([]);
  const [rejections, setRejections] = useState<RejectionEntry[]>([]);
  const [dispatches, setDispatches] = useState<DispatchEntry[]>([]);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [closingBalances, setClosingBalances] = useState<ClosingBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setAuthUser({ id: data.session.user.id, email: data.session.user.email ?? '' });
      }
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setAuthUser({ id: session.user.id, email: session.user.email ?? '' });
        } else {
          setAuthUser(null);
          setRole(null);
        }
      })();
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    fetchUserRole(authUser.id).then((r) => setRole(r));
  }, [authUser]);

  const isAdmin = role === 'admin';

  const loadData = useCallback(async () => {
    const [partsRes, prodRes, sapRes, rejRes, dispRes, planRes, openingRes, closingRes] = await Promise.all([
      supabase.from('parts').select('*').order('part_no', { ascending: true }),
      supabase.from('production_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('sap_production_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('rejection_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('dispatch_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('monthly_plans').select('*').order('created_at', { ascending: false }),
      supabase.from('opening_balances').select('*').order('created_at', { ascending: false }),
      supabase.from('closing_balances').select('*').order('created_at', { ascending: false }),
    ]);
    if (partsRes.data) setParts(partsRes.data as Part[]);
    if (prodRes.data) setProduction(prodRes.data as ProductionEntry[]);
    if (sapRes.data) setSapProduction(sapRes.data as SapProductionEntry[]);
    if (rejRes.data) setRejections(rejRes.data as RejectionEntry[]);
    if (dispRes.data) setDispatches(dispRes.data as DispatchEntry[]);
    if (planRes.data) setPlans(planRes.data as MonthlyPlan[]);
    if (openingRes.data) setOpeningBalances(openingRes.data as OpeningBalance[]);
    if (closingRes.data) setClosingBalances(closingRes.data as ClosingBalance[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authUser) loadData();
  }, [authUser, loadData]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setRole(null);
    setView('dashboard');
  }

  function navigate(v: View) {
    setView(v);
    setMobileOpen(false);
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!authUser || !role) {
    return <Login />;
  }

  const visibleNav = navItems.filter((n) => !n.adminOnly || isAdmin);
  const current = visibleNav.find((n) => n.id === view);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden print:hidden">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-1.5">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">EPP Production</p>
            <p className="text-xs leading-tight text-slate-400">Manager</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1.5"><Boxes className="h-5 w-5 text-white" /></div>
                <span className="font-bold text-slate-900">EPP Manager</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {visibleNav.map((item) => (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    view === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <item.icon className="h-5 w-5" />{item.label}
                </button>
              ))}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 font-medium text-blue-700">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                    <Eye className="h-3 w-3" /> Viewer
                  </span>
                )}
                <span className="truncate text-slate-500">{authUser.email}</span>
              </div>
              <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col print:hidden">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
            <div className="rounded-xl bg-blue-600 p-2"><Boxes className="h-6 w-6 text-white" /></div>
            <div>
              <p className="text-base font-bold leading-tight text-slate-900">EPP Production</p>
              <p className="text-xs leading-tight text-slate-400">Manager</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {visibleNav.map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  view === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className="h-5 w-5" />{item.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  <Eye className="h-3 w-3" /> Viewer
                </span>
              )}
              <span className="truncate text-xs text-slate-500">{authUser.email}</span>
            </div>
            <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {current && (
              <div className="mb-5 hidden lg:block print:hidden">
                <h1 className="text-2xl font-bold text-slate-900">{current.label}</h1>
              </div>
            )}
            {view === 'dashboard' && (
              <Dashboard
                parts={parts}
                production={production}
                sapProduction={sapProduction}
                rejections={rejections}
                dispatches={dispatches}
                plans={plans}
                openingBalances={openingBalances}
                closingBalances={closingBalances}
                loading={loading}
                role={role}
                month={month}
                onMonthChange={setMonth}
              />
            )}
            {view === 'parts' && (
              <PartsMaster parts={parts} loading={loading} onRefresh={loadData} isAdmin={isAdmin} />
            )}
            {view === 'monthly' && (
              <MonthlySheet
                parts={parts}
                production={production}
                sapProduction={sapProduction}
                rejections={rejections}
                dispatches={dispatches}
                plans={plans}
                openingBalances={openingBalances}
                closingBalances={closingBalances}
                onRefresh={loadData}
                isAdmin={isAdmin}
                month={month}
                onMonthChange={setMonth}
              />
            )}
            {view === 'reports' && (
              <Reports
                parts={parts}
                production={production}
                sapProduction={sapProduction}
                rejections={rejections}
                dispatches={dispatches}
                onRefresh={loadData}
                isAdmin={isAdmin}
                month={month}
              />
            )}
            {view === 'settings' && isAdmin && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}
