export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'admin';
  auth_provider: 'local' | 'azure_ad';
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  worked_hours: number;
  expected_hours: number;
  deficit_hours: number;
  has_justification: boolean;
  justification_type: string | null;
  justification_status: string | null;
  is_missing: boolean;
}

export interface MonthlySummary {
  year: number;
  month: number;
  user_id: string;
  user_name: string;
  total_worked_days: number;
  total_ferie_days: number;
  total_permesso_days: number;
  total_missing_days: number;
  total_hours: number;
  daily_details: DailySummary[];
}

export interface Justification {
  id: string;
  user_id: string;
  date: string;
  type: 'ferie' | 'permesso';
  status: 'inserito' | 'in_attesa' | 'approvato' | 'rifiutato';
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_name: string | null;
}

export type ExpenseType = 'viaggio' | 'autostrada' | 'soggiorno' | 'parcheggio' | 'pasti' | 'altro';

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  expense_type: ExpenseType;
  description: string;
  amount: number;
  km: number | null;
  cost_per_km: number | null;
  km_total: number | null;
  receipt_filename: string | null;
  status: 'in_attesa' | 'approvato' | 'rifiutato';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_name: string | null;
}
