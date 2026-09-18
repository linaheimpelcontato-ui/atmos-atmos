import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

async function readRows(query: any) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function useFinanceData() {
  const { data: proposals = [], error: proposalsError, isLoading: proposalsLoading } = useQuery({
    queryKey: ["fin-all-proposals"],
    queryFn: () => readRows(db
      .from("proposals")
      .select("id, title, code, total, subtotal, discount_percent, discount_fixed, proposal_accommodations(*), atmos_service, created_at, num_people, num_days, segment, status, start_date, prospect_id, seller_id")
      .order("created_at", { ascending: false })),
  });

  const { data: dayItems = [], error: dayItemsError, isLoading: dayItemsLoading } = useQuery({
    queryKey: ["fin-all-day-items"],
    queryFn: () => readRows(db
      .from("proposal_day_items")
      .select("id, proposal_id, category, catalog_item_id, item_name, value, day_number, quantity, cost_price, commission_percent")),
  });

  const { data: proposalCosts = [], error: proposalCostsError, isLoading: proposalCostsLoading } = useQuery({
    queryKey: ["fin-all-proposal-costs"],
    queryFn: () => readRows(db.from("proposal_costs").select("*")),
  });

  const { data: guides = [], error: guidesError, isLoading: guidesLoading } = useQuery({
    queryKey: ["fin-all-guides"],
    queryFn: () => readRows(db.from("guides").select("id, name, is_active").order("name")),
  });

  const { data: products = [], error: productsError, isLoading: productsLoading } = useQuery({
    queryKey: ["fin-all-products"],
    queryFn: () => readRows(db.from("products").select("id, name, type, category").order("name")),
  });

  const { data: transactions = [], error: transactionsError, isLoading: transactionsLoading } = useQuery({
    queryKey: ["fin-all-transactions"],
    queryFn: () => readRows(db.from("financial_transactions").select("*").order("due_date")),
  });

  const { data: sellers = [], error: sellersError, isLoading: sellersLoading } = useQuery({
    queryKey: ["fin-all-sellers"],
    queryFn: () => readRows(db.from("sellers").select("id, name").order("name")),
  });

  const { data: prospects = [], error: prospectsError, isLoading: prospectsLoading } = useQuery({
    queryKey: ["fin-all-prospects"],
    queryFn: () => readRows(db.from("prospects").select("id, name, email, phone, segment").order("name")),
  });

  const { data: bankAccounts = [], error: bankAccountsError, isLoading: bankAccountsLoading } = useQuery({
    queryKey: ["fin-all-bank-accounts"],
    queryFn: () => readRows(db.from("bank_accounts").select("*").order("name")),
  });

  const { data: branches = [], error: branchesError, isLoading: branchesLoading } = useQuery({
    queryKey: ["fin-all-branches"],
    queryFn: () => readRows(db.from("branches").select("*").order("name")),
  });

  const { data: accounts = [], error: accountsError, isLoading: accountsLoading } = useQuery({
    queryKey: ["fin-all-chart-accounts"],
    queryFn: () => readRows(db.from("chart_of_accounts").select("*").order("code")),
  });

  const error = [proposalsError, dayItemsError, proposalCostsError, guidesError, productsError, transactionsError, sellersError, prospectsError, bankAccountsError, branchesError, accountsError]
    .find(Boolean) || null;
  const isLoading = [proposalsLoading, dayItemsLoading, proposalCostsLoading, guidesLoading, productsLoading, transactionsLoading, sellersLoading, prospectsLoading, bankAccountsLoading, branchesLoading, accountsLoading]
    .some(Boolean);

  return { proposals, dayItems, proposalCosts, guides, products, transactions, sellers, prospects, bankAccounts, branches, accounts, error, isLoading };
}

export type Proposal = {
  id: string; title: string; code: string | null; total: number; subtotal: number;
  discount_percent?: number; discount_fixed?: number; proposal_accommodations?: any[];
  atmos_service: any; created_at: string; num_people: number;
  num_days: number; segment: string; status: string; start_date: string | null;
  prospect_id: string | null; seller_id: string | null;
};

export type DayItem = {
  id: string; proposal_id: string; category: string;
  catalog_item_id: string | null; item_name: string | null;
  value: number; day_number: number; quantity: number;
  cost_price: number; commission_percent: number;
};

export type ProposalCost = {
  id: string; proposal_id: string; amount: number; description: string;
  account_id?: string | null; supplier_id?: string | null;
};

export type Guide = { id: string; name: string; is_active: boolean };
export type Product = { id: string; name: string; type: string; category: string | null };
export type Transaction = {
  source_key: string | null;
  supplier_id: string | null; invoice_number: string | null; competence_date: string | null;
  id: string; type: string; description: string; amount: number;
  due_date: string; paid_date: string | null; status: string;
  proposal_id: string | null; account_id: string | null; seller_id: string | null;
  bank_account_id: string | null; branch_id: string | null; payment_method: string | null;
  installment_number: number | null; installment_total: number | null;
  prospect_id: string | null; is_recurring: boolean; recurrence_day: number | null;
  notes: string | null;
};
export type Seller = { id: string; name: string };
export type Prospect = { id: string; name: string; email: string | null; phone: string | null; segment: string };
export type BankAccount = {
  id: string; name: string; bank: string; agency: string; account_number: string;
  account_type: string; initial_balance: number; is_active: boolean;
};
export type Branch = { id: string; name: string; cnpj: string; address: string; is_active: boolean };
export type ChartAccount = { id: string; code: string; name: string; type: string; parent_id: string | null; is_active: boolean };
