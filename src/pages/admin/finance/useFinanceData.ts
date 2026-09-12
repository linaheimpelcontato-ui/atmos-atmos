import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useFinanceData() {
  const { data: proposals = [] } = useQuery({
    queryKey: ["fin-all-proposals"],
    queryFn: async () => {
      const { data } = await db
        .from("proposals")
        .select("id, title, code, total, subtotal, discount_percent, discount_fixed, proposal_accommodations(*), atmos_service, created_at, num_people, num_days, segment, status, start_date, prospect_id, seller_id")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: dayItems = [] } = useQuery({
    queryKey: ["fin-all-day-items"],
    queryFn: async () => {
      const { data } = await db
        .from("proposal_day_items")
        .select("id, proposal_id, category, catalog_item_id, item_name, value, day_number, quantity, cost_price, commission_percent");
      return data || [];
    },
  });

  const { data: proposalCosts = [] } = useQuery({
    queryKey: ["fin-all-proposal-costs"],
    queryFn: async () => {
      const { data } = await db.from("proposal_costs").select("*");
      return data || [];
    },
  });

  const { data: guides = [] } = useQuery({
    queryKey: ["fin-all-guides"],
    queryFn: async () => {
      const { data } = await db.from("guides").select("id, name, is_active").order("name");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["fin-all-products"],
    queryFn: async () => {
      const { data } = await db.from("products").select("id, name, type, category").order("name");
      return data || [];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["fin-all-transactions"],
    queryFn: async () => {
      const { data } = await db.from("financial_transactions").select("*").order("due_date");
      return data || [];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["fin-all-sellers"],
    queryFn: async () => {
      const { data } = await db.from("sellers").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ["fin-all-prospects"],
    queryFn: async () => {
      const { data } = await db.from("prospects").select("id, name, email, phone, segment").order("name");
      return data || [];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["fin-all-bank-accounts"],
    queryFn: async () => {
      const { data } = await db.from("bank_accounts").select("*").order("name");
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["fin-all-branches"],
    queryFn: async () => {
      const { data } = await db.from("branches").select("*").order("name");
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["fin-all-chart-accounts"],
    queryFn: async () => {
      const { data } = await db.from("chart_of_accounts").select("*").order("code");
      return data || [];
    },
  });

  return { proposals, dayItems, proposalCosts, guides, products, transactions, sellers, prospects, bankAccounts, branches, accounts };
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
