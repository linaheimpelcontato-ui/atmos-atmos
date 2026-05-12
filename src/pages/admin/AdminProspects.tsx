import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, RotateCcw, Download, Plus } from "lucide-react";
import ProspectDetailDialog from "@/components/admin/ProspectDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { useSmartFilters } from "@/components/admin/SmartTableHead";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { AtmosCard } from "@/components/admin/shared/AtmosCard";
import * as XLSX from "xlsx";

// Modular components
import { ProspectFilters } from "@/components/admin/prospects/ProspectFilters";
import { ProspectTable } from "@/components/admin/prospects/ProspectTable";
import { ProspectTableRow } from "@/components/admin/prospects/ProspectTableRow";
import { ALL_COLUMNS, getRelevantColumns, type ColumnKey } from "@/components/admin/prospects/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const normalizeText = (str: any) => 
  String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface AdminProspectsProps {
  segment: "b2c" | "b2b" | "all";
}

export default function AdminProspects({ segment: initialSegment }: AdminProspectsProps) {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>(initialSegment === "all" ? "geral" : initialSegment);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([]);

  const filterState = useSmartFilters();
  const selection = useRowSelection();
  const { toast } = useToast();

  // Initialize visible columns based on tab
  useEffect(() => {
    const relevant = getRelevantColumns(activeTab);
    setVisibleColumns(ALL_COLUMNS.filter(c => c.defaultVisible && relevant.includes(c.key)).map(c => c.key));
  }, [activeTab]);

  const orderedColumnDefs = useMemo(() => {
    return visibleColumns
      .map(key => ALL_COLUMNS.find(c => c.key === key))
      .filter(Boolean) as any[];
  }, [visibleColumns]);

  const fetchStages = useCallback(async () => {
    let query = db.from("pipeline_stages").select("*").order("position");
    if (activeTab !== "geral") {
      query = query.eq("segment", activeTab);
    }
    const { data } = await query;
    setStages(data ?? []);
  }, [activeTab]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    let query = db.from("prospects").select("*, sellers(name)").order("created_at", { ascending: false });
    
    if (activeTab !== "geral") {
      query = query.eq("segment", activeTab);
    }

    const { data: prospectData } = await query;
    const rawProspects = prospectData ?? [];
    
    if (rawProspects.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }

    const ids = rawProspects.map((p: any) => p.id);
    const [contactsRes, proposalsRes] = await Promise.all([
      db.from("contacts").select("prospect_id, name").in("prospect_id", ids),
      db.from("proposals").select("prospect_id, title, status, total, code").in("prospect_id", ids).order("created_at", { ascending: false }),
    ]);

    const contactMap = new Map<string, { count: number; primary: string }>();
    (contactsRes.data ?? []).forEach((c: any) => {
      const existing = contactMap.get(c.prospect_id);
      if (existing) {
        existing.count++;
      } else {
        contactMap.set(c.prospect_id, { count: 1, primary: c.name });
      }
    });

    const proposalMap = new Map<string, { count: number; total: number }>();
    (proposalsRes.data ?? []).forEach((pr: any) => {
      const existing = proposalMap.get(pr.prospect_id);
      if (existing) {
        existing.count++;
        existing.total += Number(pr.total) || 0;
      } else {
        proposalMap.set(pr.prospect_id, {
          count: 1,
          total: Number(pr.total) || 0,
        });
      }
    });

    const enriched = rawProspects.map((p: any) => ({
      ...p,
      _contact_count: contactMap.get(p.id)?.count ?? 0,
      _primary_contact: contactMap.get(p.id)?.primary ?? "",
      _proposal_count: proposalMap.get(p.id)?.count ?? 0,
      _proposal_total: proposalMap.get(p.id)?.total ?? 0,
    }));

    setProspects(enriched);
    setLoading(false);
  }, [activeTab]);

  const counts = useMemo(() => ({
    geral: prospects.length,
    b2c: prospects.filter(p => p.segment === "b2c").length,
    b2b: prospects.filter(p => p.segment === "b2b").length,
  }), [prospects]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch from all potential lead sources
      const [quotesRes, imersaoRes, contactsRes, prospectsRes] = await Promise.all([
        db.from("quote_requests").select("*"),
        db.from("imersao_leads").select("*"),
        db.from("contacts").select("*"),
        db.from("prospects").select("id, email")
      ]);

      const existingEmailsMap = new Map((prospectsRes.data ?? []).map((p: any) => [p.email?.toLowerCase(), p.id]).filter(([email]) => !!email));
      
      let newCount = 0;
      let updatedCount = 0;

      // 2. Process B2C Quotes
      for (const q of (quotesRes.data ?? [])) {
        const email = q.user_email?.toLowerCase();
        if (!email) continue;
        
        const answers = typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers;
        const prospectData = {
          name: q.user_name || "Cliente Site",
          email: q.user_email,
          phone: q.user_phone,
          segment: "b2c",
          source: "site",
          notes: `Solicitação via site. Status original: ${q.status}.`
        };

        if (existingEmailsMap.has(email)) {
          // If it exists, we only update if it was a 'pending' one to avoid overwriting manual edits
          if (q.status === "pending") {
            await db.from("prospects").update(prospectData).eq("id", existingEmailsMap.get(email));
            updatedCount++;
          }
        } else {
          await db.from("prospects").insert(prospectData);
          newCount++;
          existingEmailsMap.set(email, "temp-id"); // Prevent double insert in same loop
        }
        if (q.status === "pending") await db.from("quote_requests").update({ status: "contacted" }).eq("id", q.id);
      }

      // 3. Process B2B Imersao Leads
      for (const i of (imersaoRes.data ?? [])) {
        const email = i.email?.toLowerCase();
        if (!email) continue;

        const prospectData = {
          name: i.nome || "Lead Imersão",
          email: i.email,
          phone: i.telefone,
          segment: "b2b",
          source: "site",
          company_name: i.empresa,
          notes: `Interesse em imersão. Empresa: ${i.empresa}.`
        };

        if (existingEmailsMap.has(email)) {
          if (i.status === "novo") {
            await db.from("prospects").update(prospectData).eq("id", existingEmailsMap.get(email));
            updatedCount++;
          }
        } else {
          await db.from("prospects").insert(prospectData);
          newCount++;
          existingEmailsMap.set(email, "temp-id");
        }
        if (i.status === "novo") await db.from("imersao_leads").update({ status: "processado" }).eq("id", i.id);
      }

      // 4. Process Generic Contacts
      for (const c of (contactsRes.data ?? [])) {
        const email = c.email?.toLowerCase();
        if (!email) continue;

        if (!existingEmailsMap.has(email)) {
          await db.from("prospects").insert({
            name: c.name || "Contato Site",
            email: c.email,
            phone: c.phone,
            segment: "b2c",
            source: "site",
            notes: `Contato genérico via site: ${c.subject || ""}`
          });
          newCount++;
          existingEmailsMap.set(email, "temp-id");
        }
      }

      if (newCount > 0 || updatedCount > 0) {
        toast({ 
          title: "Sincronização concluída", 
          description: `${newCount} novos clientes e ${updatedCount} atualizados.` 
        });
        fetchProspects();
      } else {
        toast({ title: "Sincronização", description: "Todos os dados do site já estão sincronizados." });
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchProspects, toast]);

  useEffect(() => {
    fetchStages();
    fetchProspects();
    handleSync();
  }, [fetchStages, fetchProspects, handleSync]);

  const valueExtractors = useMemo(() => {
    const extractors: Record<string, (row: any) => unknown> = {};
    if (ALL_COLUMNS) {
      ALL_COLUMNS.forEach(col => {
        if (col.valueExtractor) {
          extractors[col.key] = col.valueExtractor;
        }
      });
    }
    return extractors;
  }, []);

  const filtered = useMemo(() => {
    let result = prospects;
    if (search) {
      const s = normalizeText(search);
      result = result.filter((p: any) =>
        [
          p.name, p.email, p.phone, p.company_name, p.city, p.document, p.instagram, p._primary_contact
        ]
          .some(v => v && normalizeText(v).includes(s))
      );
    }
    return filterState.applyFilters(result, valueExtractors);
  }, [prospects, search, filterState, valueExtractors]);

  const handleCreateProspect = async () => {
    const defaultSegment = activeTab === "geral" ? "b2c" : activeTab as "b2c" | "b2b";
    
    const { data, error } = await db.from("prospects")
      .insert({ 
        name: "Novo Cliente", 
        segment: defaultSegment,
        source: "manual"
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating prospect:", error);
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Cliente criado com sucesso" });
      setSelectedProspectId(data.id);
      fetchProspects();
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((p: any) => {
      const obj: Record<string, unknown> = {};
      orderedColumnDefs.forEach(col => {
        const ext = col.valueExtractor;
        obj[col.label] = ext ? ext(p) : p[col.key];
      });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        if (json.length === 0) {
          toast({ title: "Arquivo vazio", variant: "destructive" });
          return;
        }

        const prospectsToInsert = json.map(row => ({
          name: row.Nome || row.name || "Importado",
          email: row.Email || row.email,
          phone: String(row.Telefone || row.phone || "").replace(/\D/g, ""),
          segment: row.Tipo?.toLowerCase() === 'b2b' ? 'b2b' : 'b2c',
          source: 'import',
          company_name: row.Empresa || row.company_name,
          city: row.Cidade || row.city,
          country: row.País || row.country,
          birth_date: row["Data de Nascimento"] || row.birth_date,
          document: String(row.Documento || row.document || "").replace(/\D/g, ""),
          document_type: String(row.Documento || row.document || "").length > 11 ? "cnpj" : "cpf",
        }));

        const { error } = await db.from("prospects").insert(prospectsToInsert);
        if (error) {
          toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Importação concluída", description: `${prospectsToInsert.length} clientes importados.` });
          fetchProspects();
        }
      };
      reader.readAsBinaryString(file);
    };
    input.click();
  };

  const bulkFields: BulkField[] = useMemo(() => [
    { key: "name", label: "Nome", type: "text" },
    { key: "company_name", label: "Empresa", type: "text" },
    { key: "segment", label: "Tipo", type: "select", options: [{ value: "b2b", label: "B2B" }, { value: "b2c", label: "B2C" }] },
    { key: "potential", label: "Potencial", type: "select", options: [{ value: "high", label: "Alto" }, { value: "medium", label: "Médio" }, { value: "low", label: "Baixo" }] },
  ], []);

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const { error } = await db.from("prospects").update({ [field]: value }).in("id", Array.from(selection.selectedIds));
    if (error) {
      toast({ title: "Erro na atualização em massa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Clientes atualizados" });
      selection.clear();
      fetchProspects();
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-12 min-w-0"
    >
      <PageHeader
        title="Gestão de Clientes"
        subtitle="Visualização consolidada de todos os perfis e segmentos Atmos"
        icon={Users}
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setVisibleColumns(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))} 
              className="rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-4 border-admin-border/60 hover:bg-admin-muted"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2 opacity-60" /> Resetar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport} 
              className="rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-4 border-admin-border/60 hover:bg-admin-muted"
            >
              <Download className="h-3.5 w-3.5 mr-2 opacity-60" /> Exportar
            </Button>
            <Button 
              onClick={handleCreateProspect} 
              size="sm" 
              className="h-10 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] px-6 shadow-lg shadow-admin-primary/10 bg-admin-primary hover:bg-admin-primary/90"
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> Novo Cliente
            </Button>
          </div>
        }
      />

      <AtmosCard className="flex-1 flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.03)] border-admin-border/40 overflow-visible rounded-[3rem]">
        <ProspectFilters 
          search={search}
          onSearchChange={setSearch}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
          onNewProspect={handleCreateProspect}
          onSync={handleSync}
          isSyncing={isSyncing}
          onExport={handleExport}
          onImport={handleImport}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        />

        <ProspectTable 
          prospects={filtered}
          isLoading={loading}
          filterState={filterState}
          selectedIds={selection.selectedIds}
          onToggleRow={selection.toggle}
          onToggleAll={selection.toggleAll}
          columnDefs={orderedColumnDefs}
          renderRow={(p) => (
            <ProspectTableRow 
              key={p.id}
              prospect={p}
              stages={stages}
              selected={selection.isSelected(p.id)}
              onToggle={selection.toggle}
              onClick={setSelectedProspectId}
              visibleColumns={orderedColumnDefs}
            />
          )}
        />
      </AtmosCard>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          await db.from("prospects").delete().in("id", Array.from(selection.selectedIds));
          toast({ title: "Clientes excluídos" });
          selection.clear();
          fetchProspects();
        }}
        onExport={handleExport}
        bulkFields={bulkFields}
        onBulkUpdate={handleBulkUpdate}
      />

      <ProspectDetailDialog
        open={!!selectedProspectId}
        onOpenChange={open => { if (!open) setSelectedProspectId(null); }}
        prospectId={selectedProspectId}
        stages={stages}
        segment={(activeTab === "geral" ? "b2c" : activeTab) as "b2c" | "b2b"}
        onUpdated={fetchProspects}
      />
    </motion.div>
  );
}
