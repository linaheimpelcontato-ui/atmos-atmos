import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const OLD_URL = "https://ptxvfmxnajqdsohuugbv.supabase.co";
const OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eHZmbXhuYWpxZHNvaHV1Z2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzMxODUsImV4cCI6MjA4NzEwOTE4NX0.0oHuNmOQEQXaZ_k5sTvNt8ubL6DVkFpntHRi0Iiok1c";

const supabase = createClient(OLD_URL, OLD_ANON_KEY);

const tables = [
  "admin_permissions", "bank_accounts", "branches", "calendar_events",
  "catalog_items", "chart_of_accounts", "contacts", "default_prices",
  "email_templates", "financial_transactions", "guide_trip_costs",
  "guide_waterfall_prices", "guides", "image_focal_points",
  "imersao_leads", "itinerary_checklist", "map_points", "pipeline_stages",
  "products", "profiles", "proposal_accommodations", "proposal_cost_checks",
  "proposal_costs", "proposal_day_items", "proposal_days", "proposal_feedback",
  "proposal_items", "proposals", "prospect_interactions", "prospects",
  "quote_requests", "sales_goals", "sellers", "site_overrides",
  "suppliers", "user_roles", "wishlist_items"
];

async function dump() {
  const dataStore = {};
  for (const table of tables) {
    const { data, error } = await supabase.rpc('export_table_data', { table_name: table });
    if (error) {
       console.error(`Erro ao baixar a tabela ${table}:`, error.message);
    } else {
       dataStore[table] = data;
       console.log(`Baixadas ${data?.length || 0} linhas da tabela -> ${table}`);
    }
  }
  fs.writeFileSync('banco-old.json', JSON.stringify(dataStore, null, 2));
  console.log("Sucesso! Tudo extraído e salvo em banco-old.json.");
}

dump();
