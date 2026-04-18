// ---------------------------------------------------------------------------
// Enums (mirror backend constants.py)
// ---------------------------------------------------------------------------

export type HsaCategory =
  | 'doctors_visits'
  | 'prescription_drugs'
  | 'dental_care'
  | 'vision_care'
  | 'mental_health'
  | 'physical_therapy'
  | 'chiropractic'
  | 'acupuncture'
  | 'hospital_services'
  | 'surgery'
  | 'lab_tests'
  | 'medical_equipment'
  | 'hearing_aids'
  | 'menstrual_products'
  | 'birth_control'
  | 'fertility_treatment'
  | 'smoking_cessation'
  | 'weight_loss_program'
  | 'long_term_care'
  | 'transportation'
  | 'insurance_premiums'
  | 'other_eligible'

export type PaymentMethod = 'out_of_pocket' | 'hsa'
export type ReimbursementStatus = 'pending' | 'reimbursed'
export type ContributionSource = 'self' | 'employer' | 'other'
export type CoverageType = 'individual' | 'family'

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

export interface ReceiptOut {
  id: string
  expense_id: string
  original_filename: string
  mime_type: string
  file_size: number       // bytes
  created_at: string      // ISO datetime
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** Lightweight reimbursement view nested inside ExpenseOut */
export interface ReimbursementSummary {
  id: string
  status: ReimbursementStatus
  reimbursed_date: string | null   // ISO date "YYYY-MM-DD"
  reimbursed_amount: string | null // Decimal serialized as string
}

export interface ExpenseOut {
  id: string
  date: string             // ISO date "YYYY-MM-DD"
  provider_name: string
  description: string
  amount: string           // Decimal as string e.g. "125.00"
  category: HsaCategory
  payment_method: PaymentMethod
  notes: string | null
  reimbursement: ReimbursementSummary | null
  receipts: ReceiptOut[]
  created_at: string
  updated_at: string
}

export interface PaginatedExpenses {
  items: ExpenseOut[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ExpenseCreate {
  date: string
  provider_name: string
  description: string
  amount: string
  category: HsaCategory
  payment_method: PaymentMethod
  notes?: string
}

export interface ExpenseUpdate {
  date?: string
  provider_name?: string
  description?: string
  amount?: string
  category?: HsaCategory
  payment_method?: PaymentMethod
  notes?: string
}

// ---------------------------------------------------------------------------
// Reimbursements
// ---------------------------------------------------------------------------

/** Lightweight expense view nested inside ReimbursementOut */
export interface ExpenseSummary {
  id: string
  date: string
  provider_name: string
  amount: string
}

export interface ReimbursementOut {
  id: string
  expense_id: string
  expense: ExpenseSummary
  status: ReimbursementStatus
  reimbursed_date: string | null
  reimbursed_amount: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedReimbursements {
  items: ReimbursementOut[]
  total: number
  page: number
  pages: number
  pending_amount: string
  reimbursed_amount_ytd: string
}

export interface ReimbursementCreate {
  expense_id: string
  notes?: string
}

export interface ReimbursementUpdate {
  status?: ReimbursementStatus
  reimbursed_date?: string
  reimbursed_amount?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export interface ContributionOut {
  id: string
  date: string
  amount: string
  source: ContributionSource
  tax_year: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedContributions {
  items: ContributionOut[]
  total_contributed: string
  tax_year: number
  limit_individual: string
  limit_family: string
  remaining_individual: string
  remaining_family: string
}

export interface ContributionCreate {
  date: string
  amount: string
  source: ContributionSource
  tax_year: number
  notes?: string
}

export interface ContributionUpdate {
  date?: string
  amount?: string
  source?: ContributionSource
  tax_year?: number
  notes?: string
}

// ---------------------------------------------------------------------------
// Account Balance
// ---------------------------------------------------------------------------

export interface BalanceOut {
  id: string
  balance: string
  as_of_date: string
  notes: string | null
  created_at: string
}

export interface BalanceList {
  items: BalanceOut[]
  latest: BalanceOut | null
}

export interface BalanceCreate {
  balance: string
  as_of_date: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Summary (dashboard)
// ---------------------------------------------------------------------------

export interface SummaryOut {
  year: number
  total_expenses: string
  hsa_paid_expenses: string
  out_of_pocket_expenses: string
  pending_reimbursement: string
  reimbursed_ytd: string
  total_contributed: string
  limit_individual: string
  limit_family: string
  remaining_individual: string
  remaining_family: string
  latest_balance: string | null
  latest_balance_date: string | null
}

// ---------------------------------------------------------------------------
// App Settings
// ---------------------------------------------------------------------------

export interface AppSettings {
  id: string
  coverage_type: CoverageType
  catch_up_eligible: boolean
  updated_at: string
}

export interface AppSettingsUpdate {
  coverage_type?: CoverageType
  catch_up_eligible?: boolean
}
