import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const PART_CATEGORIES = ['CPD', 'Foshan Mat', '7330-30P Mat', 'Other'] as const;
export const ENTRY_CATEGORIES = ['CPD', 'Foshan Mat', '7330-30P Mat', 'Other'] as const;
export type PartCategory = (typeof PART_CATEGORIES)[number];

export type Part = {
  id: string;
  part_no: string;
  part_name: string;
  category: string;
  qty: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductionEntry = {
  id: string;
  part_id: string;
  part_no: string;
  qty_produced: number;
  production_date: string;
  category: string;
  created_at?: string;
};

export type SapProductionEntry = {
  id: string;
  part_id: string;
  part_no: string;
  qty_produced: number;
  production_date: string;
  category: string;
  created_at?: string;
};

export type RejectionEntry = {
  id: string;
  part_no: string;
  part_name: string;
  rejection_store: string;
  rejection_date: string;
  qty: number;
  category: string;
  created_at?: string;
};

export type DispatchEntry = {
  id: string;
  part_no: string;
  part_name: string;
  migo_type: string;
  dispatch_date: string;
  qty: number;
  category: string;
  created_at?: string;
};

export type MonthlyPlan = {
  id: string;
  part_no: string;
  month: string;
  plan_qty: number;
  category: string;
  created_at?: string;
};

export type OpeningBalance = {
  id: string;
  part_no: string;
  month: string;
  qty: number;
  category: string;
  created_at?: string;
};

export type ClosingBalance = {
  id: string;
  part_no: string;
  month: string;
  qty: number;
  category: string;
  created_at?: string;
};

export type NewPart = Omit<Part, 'id' | 'created_at' | 'updated_at'>;

export type EntryType = 'production' | 'sap' | 'rejection' | 'dispatch' | 'opening';

export type UserRole = 'admin' | 'viewer';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

/** Fetch the role for a given user id from user_roles table */
export async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as UserRole;
}
