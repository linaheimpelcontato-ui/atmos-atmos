import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Package, ClipboardList, RefreshCw, ChevronDown, ChevronUp, X, CalendarIcon, Search, SlidersHorizontal, Download, ArrowRight, Building2, Plane, FileText, PlusCircle } from "lucide-react";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import ProposalFormDialog from "@/components/admin/ProposalFormDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

type QuoteStatus = "pending" | "contacted" | "closed" | "novo";
// originFilter removed — segment is now a prop

/** Unified lead shape used by the table */
interface UnifiedLead {
  id: string;
  origin: "turista" | "imersao";
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  language: string | null;
  created_at: string;
  // turista-specific
  items?: unknown;
  answers?: unknown;
  // imersao-specific
  empresa?: string;
  cargo?: string;
  tipo_grupo?: string;
  num_participantes?: string;
  quando?: string;
  objetivos?: unknown;
  hospedagem?: string;
  orcamento?: string;
  experiencia_grupos?: string;
  conhece_chapada?: string;
  como_conheceu?: string;
  observacoes?: string;
  instagram_site?: string;
  data_especifica?: string | null;
  data_especifica_fim?: string | null;
}

interface AdvancedFilters {
  name: string;
  language: string;
  transport: string;
  children: string;
  mobility: string;
  hasAccommodation: string;
  startDateFrom: Date | undefined;
  startDateTo: Date | undefined;
  createdFrom: Date | undefined;
  createdTo: Date | undefined;
}

const defaultFilters: AdvancedFilters = {
  name: "",
  language: "",
  transport: "",
  children: "",
  mobility: "",
  hasAccommodation: "",
  startDateFrom: undefined,
  startDateTo: undefined,
  createdFrom: undefined,
  createdTo: undefined,
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  contacted: { label: "Contatado", className: "bg-blue-100 text-blue-800 border-blue-200" },
  closed: { label: "Encerrado", className: "bg-green-100 text-green-800 border-green-200" },
  novo: { label: "Novo", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
};

const typeLabel: Record<string, string> = {
  itinerary: "Roteiro",
  waterfall: "Cachoeira",
  experience: "Experiência",
  accommodation: "Hospedagem",
  service: "Serviço",
};

const answerLabels: Record<string, string> = {
  status: "Situação",
  startDate: "Início da viagem",
  endDate: "Fim da viagem",
  numDays: "Nº Diárias",
  groupSize: "Pessoas no grupo",
  children: "Crianças",
  mobility: "Mobilidade",
  mobilityDetails: "Detalhes de mobilidade",
  transport: "Transporte",
  hasAccommodation: "Hospedagem reservada",
  accommodationLocation: "Local da hospedagem",
  notes: "Observações",
};

/** Ordered keys for questionnaire answers display */
const answerKeyOrder = [
  "status", "startDate", "endDate", "numDays", "groupSize", "children",
  "mobility", "mobilityDetails", "transport", "hasAccommodation",
  "accommodationLocation", "notes",
];

type FilterStatus = "all" | QuoteStatus;

function DatePickerButton({ date, onSelect, placeholder }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal text-sm h-9", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function AdminQuotes({ segment }: { segment: "b2c" | "b2b" }) {
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [filters, setFilters] = useState<AdvancedFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<UnifiedLead | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingToPipeline, setSendingToPipeline] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const filterState = useSmartFilters();
  const { toast } = useToast();
  const selection = useRowSelection();
  const [pipelineStageName, setPipelineStageName] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);

  // Proposal integration state
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalEditingId, setProposalEditingId] = useState<string | null>(null);
  const [linkedProposal, setLinkedProposal] = useState<{ id: string; code: string } | null>(null);
  const [linkedProspectId, setLinkedProspectId] = useState<string | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    if (segment === "b2c") {
      const { data } = await db.from("quote_requests").select("*").order("created_at", { ascending: false });
      const turistaLeads: UnifiedLead[] = ((data || []) as any[]).map((q: any) => ({
        id: q.id,
        origin: "turista" as const,
        name: q.user_name,
        email: q.user_email,
        phone: q.user_phone,
        status: q.status,
        language: q.language,
        created_at: q.created_at,
        items: q.items,
        answers: q.answers,
      }));
      setLeads(turistaLeads);
    } else {
      const { data } = await db.from("imersao_leads").select("*").order("created_at", { ascending: false });
      const imersaoLeads: UnifiedLead[] = ((data || []) as any[]).map((i: any) => ({
        id: i.id,
        origin: "imersao" as const,
        name: i.nome,
        email: i.email,
        phone: i.telefone,
        status: i.status,
        language: null,
        created_at: i.created_at,
        empresa: i.empresa,
        cargo: i.cargo,
        tipo_grupo: i.tipo_grupo,
        num_participantes: i.num_participantes,
        quando: i.quando,
        objetivos: i.objetivos,
        hospedagem: i.hospedagem,
        orcamento: i.orcamento,
        experiencia_grupos: i.experiencia_grupos,
        conhece_chapada: i.conhece_chapada,
        como_conheceu: i.como_conheceu,
        observacoes: i.observacoes,
        instagram_site: i.instagram_site,
        data_especifica: i.data_especifica,
        data_especifica_fim: i.data_especifica_fim,
      }));
      setLeads(imersaoLeads);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [segment]);

  // Lookup linked prospect, proposal & pipeline stage when a lead is selected
  useEffect(() => {
    if (!selected?.email) {
      setLinkedProposal(null);
      setLinkedProspectId(null);
      setPipelineStageName(null);
      return;
    }
    setLoadingProposal(true);
    setLoadingStage(true);
    (async () => {
      const { data: prospect } = await (supabase as any)
        .from("prospects")
        .select("id, stage_id")
        .eq("email", selected.email)
        .limit(1)
        .maybeSingle();
      if (prospect) {
        setLinkedProspectId(prospect.id);
        const { data: proposal } = await (supabase as any)
          .from("proposals")
          .select("id, code")
          .eq("prospect_id", prospect.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setLinkedProposal(proposal ? { id: proposal.id, code: proposal.code || "—" } : null);

        // Fetch pipeline stage name
        if (prospect.stage_id) {
          const { data: stage } = await (supabase as any)
            .from("pipeline_stages")
            .select("name")
            .eq("id", prospect.stage_id)
            .maybeSingle();
          setPipelineStageName(stage?.name || null);
        } else {
          setPipelineStageName(null);
        }
      } else {
        setLinkedProspectId(null);
        setLinkedProposal(null);
        setPipelineStageName(null);
      }
      setLoadingProposal(false);
      setLoadingStage(false);
    })();
  }, [selected]);

  const getAnswers = (lead: UnifiedLead): Record<string, unknown> => {
    if (!lead.answers) return {};
    if (typeof lead.answers === "object") return lead.answers as Record<string, unknown>;
    try { return JSON.parse(String(lead.answers)); } catch { return {}; }
  };

  const getItems = (lead: UnifiedLead): { name: string; type: string; details?: string }[] => {
    if (!lead.items) return [];
    if (Array.isArray(lead.items)) return lead.items as { name: string; type: string; details?: string }[];
    try { return JSON.parse(String(lead.items)); } catch { return []; }
  };

  // Client-side filtering
  const filteredLeads = leads.filter((lead) => {
    const answers = lead.origin === "turista" ? getAnswers(lead) : {};

    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (filters.name && !(lead.name || "").toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.language && lead.origin === "turista" && (lead.language || "pt") !== filters.language) return false;

    // These filters only apply to turista leads
    if (lead.origin === "turista") {
      if (filters.transport && answers.transport !== filters.transport) return false;
      if (filters.children && answers.children !== filters.children) return false;
      if (filters.mobility && answers.mobility !== filters.mobility) return false;
      if (filters.hasAccommodation && answers.hasAccommodation !== filters.hasAccommodation) return false;

      if (filters.startDateFrom || filters.startDateTo) {
        const raw = answers.startDate as string | undefined;
        if (!raw) return false;
        const sd = new Date(raw);
        if (filters.startDateFrom && sd < filters.startDateFrom) return false;
        if (filters.startDateTo && sd > filters.startDateTo) return false;
      }
    }

    // created_at range
    if (filters.createdFrom || filters.createdTo) {
      const cd = new Date(lead.created_at);
      if (filters.createdFrom && cd < filters.createdFrom) return false;
      if (filters.createdTo) {
        const to = new Date(filters.createdTo);
        to.setHours(23, 59, 59, 999);
        if (cd > to) return false;
      }
    }

    return true;
  }).filter((lead) => {
    if (!quickSearch) return true;
    const q = quickSearch.toLowerCase();
    return (
      (lead.name || "").toLowerCase().includes(q) ||
      (lead.email || "").toLowerCase().includes(q) ||
      (lead.phone || "").includes(q) ||
      (lead.empresa || "").toLowerCase().includes(q)
    );
  });

  const sortedLeads = useMemo(() => filterState.applyFilters(filteredLeads), [filteredLeads, filterState]);

  const activeFilterCount = [
    filters.name,
    filters.language,
    filters.transport,
    filters.children,
    filters.mobility,
    filters.hasAccommodation,
    filters.startDateFrom,
    filters.startDateTo,
    filters.createdFrom,
    filters.createdTo,
  ].filter(Boolean).length;

  const clearFilters = () => setFilters(defaultFilters);

  const exportToCsv = () => {
    const headers = [
      "Origem", "Nome", "E-mail", "Telefone", "Status", "Data da solicitação",
      "Empresa", "Cargo", "Tipo Grupo", "Participantes",
      "Situação da viagem", "Início da viagem", "Fim da viagem", "Pessoas no grupo", "Crianças",
      "Mobilidade reduzida", "Transporte", "Hospedagem reservada",
      "Local da hospedagem", "Observações", "Itens da wishlist",
    ];

    const escapeCell = (val: unknown): string => {
      const str = val == null ? "" : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredLeads.map((lead) => {
      const answers = getAnswers(lead);
      const items = getItems(lead);
      const itemsList = items.map((i) => i.name).join("; ");
      const createdFormatted = format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });

      let startDateFormatted = "";
      let endDateFormatted = "";
      if (answers.startDate) {
        try { startDateFormatted = format(new Date(String(answers.startDate)), "dd/MM/yyyy", { locale: ptBR }); } catch { /* ignore */ }
      }
      if (answers.endDate) {
        try { endDateFormatted = format(new Date(String(answers.endDate)), "dd/MM/yyyy", { locale: ptBR }); } catch { /* ignore */ }
      }

      return [
        lead.origin === "turista" ? "Turista" : "Imersão",
        lead.name,
        lead.email,
        lead.phone,
        statusConfig[lead.status]?.label || lead.status,
        createdFormatted,
        lead.empresa || "",
        lead.cargo || "",
        lead.tipo_grupo || "",
        lead.num_participantes || "",
        answers.status,
        startDateFormatted,
        endDateFormatted,
        answers.groupSize,
        answers.children,
        answers.mobility,
        answers.transport,
        answers.hasAccommodation,
        answers.accommodationLocation,
        lead.observacoes || answers.notes || "",
        itemsList,
      ].map(escapeCell).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const today = format(new Date(), "yyyy-MM-dd");
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamentos-atmos-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleStatusChange = async (lead: UnifiedLead, newStatus: string) => {
    setUpdatingStatus(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const table = lead.origin === "turista" ? "quote_requests" : "imersao_leads";
    await db.from(table).update({ status: newStatus }).eq("id", lead.id);

    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l))
    );
    if (selected?.id === lead.id) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
    }
    setUpdatingStatus(false);
  };

  const handleSendToPipeline = async (lead: UnifiedLead) => {
    setSendingToPipeline(true);
    const segment = lead.origin === "turista" ? "b2c" : "b2b";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Route site leads to "Aguardando Atendimento" stage
    const { data: stages } = await db
      .from("pipeline_stages")
      .select("id, name")
      .eq("segment", segment)
      .order("position", { ascending: true });

    const awaitingStage = stages?.find((s: Record<string, unknown>) =>
      (s.name as string).toLowerCase().includes("aguardando atendimento")
    );
    const stageId = awaitingStage?.id || stages?.[0]?.id || null;

    const prospectData: Record<string, unknown> = {
      name: lead.name || "Sem nome",
      email: lead.email,
      phone: lead.phone,
      segment,
      source: "site",
      stage_id: stageId,
      tags: [lead.origin === "turista" ? "turista" : "imersão"],
    };

    if (lead.origin === "imersao") {
      prospectData.company_name = lead.empresa;
      prospectData.notes = [
        lead.cargo && `Cargo: ${lead.cargo}`,
        lead.tipo_grupo && `Tipo grupo: ${lead.tipo_grupo}`,
        lead.num_participantes && `Participantes: ${lead.num_participantes}`,
        lead.quando && `Quando: ${lead.quando}`,
        lead.orcamento && `Orçamento: ${lead.orcamento}`,
        lead.observacoes,
      ].filter(Boolean).join("\n");
    } else {
      const answers = getAnswers(lead);
      const items = getItems(lead);
      prospectData.notes = [
        answers.groupSize && `Grupo: ${answers.groupSize} pessoas`,
        answers.startDate && `Data: ${answers.startDate}`,
        answers.transport && `Transporte: ${answers.transport}`,
        items.length > 0 && `Itens: ${items.map(i => i.name).join(", ")}`,
      ].filter(Boolean).join("\n");
    }

    const { error } = await db.from("prospects").insert(prospectData);

    if (error) {
      toast({ title: "Erro ao enviar para pipeline", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead enviado para o pipeline!", description: `Segmento: ${segment.toUpperCase()}` });
    }
    setSendingToPipeline(false);
  };

  const buildWhatsAppUrl = (lead: UnifiedLead) => {
    if (!lead.phone) return null;
    const phone = lead.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${lead.name || ""}! Sou da ATMOS, vi sua solicitação e gostaria de te atender.`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const groupedItems = (lead: UnifiedLead) => {
    const items = getItems(lead);
    const groups: Record<string, { name: string; details?: string }[]> = {};
    for (const item of items) {
      const type = typeLabel[item.type] || item.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push({ name: item.name, details: item.details });
    }
    return groups;
  };

  const statusFilterButtons: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendente" },
    { value: "novo", label: "Novo" },
    { value: "contacted", label: "Contatado" },
    { value: "closed", label: "Encerrado" },
  ];


  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Solicitações {segment === "b2c" ? "B2C — Turistas" : "B2B — Imersões"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredLeads.length} de {leads.length} solicitações
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={exportToCsv} className="gap-2" disabled={filteredLeads.length === 0}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>


      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setStatusFilter(btn.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === btn.value
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Quick search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, telefone..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Advanced Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
        <div className="flex items-center gap-3">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros avançados
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          {activeFilterCount > 0 && (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                {activeFilterCount} {activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground h-8 px-2">
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            </>
          )}
        </div>

        <CollapsibleContent>
          <div className="mt-4 p-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

              {/* Name search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={filters.name}
                    onChange={(e) => setFilter("name", e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Idioma</label>
                <Select value={filters.language || "all"} onValueChange={(v) => setFilter("language", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transport */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transporte</label>
                <Select value={filters.transport || "all"} onValueChange={(v) => setFilter("transport", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Carro próprio">Carro próprio</SelectItem>
                    <SelectItem value="4x4 próprio">4x4 próprio</SelectItem>
                    <SelectItem value="4x4 do guia">4x4 do guia</SelectItem>
                    <SelectItem value="Ainda não sei">Ainda não sei</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Children */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crianças</label>
                <Select value={filters.children || "all"} onValueChange={(v) => setFilter("children", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Não tem crianças">Sem crianças</SelectItem>
                    <SelectItem value="Menores de 10 anos">Menores de 10 anos</SelectItem>
                    <SelectItem value="Acima de 10 anos">Acima de 10 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobility */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobilidade reduzida</label>
                <Select value={filters.mobility || "all"} onValueChange={(v) => setFilter("mobility", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Não sei">Não sei</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accommodation */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hospedagem reservada</label>
                <Select value={filters.hasAccommodation || "all"} onValueChange={(v) => setFilter("hasAccommodation", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Ainda não sei">Ainda não sei</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start date range */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de início (de / até)</label>
                <div className="flex gap-2">
                  <DatePickerButton date={filters.startDateFrom} onSelect={(d) => setFilter("startDateFrom", d)} placeholder="De" />
                  <DatePickerButton date={filters.startDateTo} onSelect={(d) => setFilter("startDateTo", d)} placeholder="Até" />
                </div>
              </div>

              {/* Request date range */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data da solicitação (de / até)</label>
                <div className="flex gap-2">
                  <DatePickerButton date={filters.createdFrom} onSelect={(d) => setFilter("createdFrom", d)} placeholder="De" />
                  <DatePickerButton date={filters.createdTo} onSelect={(d) => setFilter("createdTo", d)} placeholder="Até" />
                </div>
              </div>

            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto overscroll-x-contain max-h-[calc(100vh-340px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <th className="p-3 w-10">
                <Checkbox
                  checked={sortedLeads.length > 0 && sortedLeads.every(l => selection.isSelected(l.id))}
                  onCheckedChange={() => selection.toggleAll(sortedLeads.map(l => l.id))}
                />
              </th>
              <TableHead>Origem</TableHead>
              <SmartTableHead label="Nome" sortKey="name" filterState={filterState} data={filteredLeads} />
              <SmartTableHead label="E-mail" sortKey="email" filterState={filterState} data={filteredLeads} className="hidden md:table-cell" />
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <SmartTableHead label="Data" sortKey="created_at" filterState={filterState} data={filteredLeads} className="hidden md:table-cell" />
              {segment === "b2c" && (
                <>
                  <SmartTableHead label="Situação" sortKey="ans_status" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.status || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Crianças" sortKey="ans_children" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.children || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Mobilidade" sortKey="ans_mobility" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.mobility || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Grupo" sortKey="ans_groupSize" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.groupSize || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Período" sortKey="ans_startDate" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.startDate || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Nº Diárias" sortKey="ans_numDays" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.numDays || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Transporte" sortKey="ans_transport" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.transport || ""; }} className="hidden lg:table-cell" />
                  <SmartTableHead label="Hospedagem" sortKey="ans_hasAccommodation" filterState={filterState} data={filteredLeads} valueExtractor={(row: unknown) => { const a = getAnswers(row as UnifiedLead); return a.hasAccommodation || ""; }} className="hidden lg:table-cell" />
                </>
              )}
              {segment === "b2b" && (
                <TableHead className="hidden sm:table-cell">Info</TableHead>
              )}
              <SmartTableHead label="Status" sortKey="status" filterState={filterState} data={leads} labelMap={Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label]))} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={segment === "b2c" ? 15 : 8} className="text-center text-muted-foreground py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={segment === "b2c" ? 15 : 8} className="text-center text-muted-foreground py-10">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              sortedLeads.map((lead) => {
                const statusCfg = statusConfig[lead.status] || statusConfig.pending;
                const items = getItems(lead);
                const answers = lead.origin === "turista" ? getAnswers(lead) : {};
                let periodFormatted = "—";
                if (answers.startDate) {
                  try {
                    const sd = format(new Date(String(answers.startDate)), "dd/MM", { locale: ptBR });
                    if (answers.endDate) {
                      const ed = format(new Date(String(answers.endDate)), "dd/MM", { locale: ptBR });
                      periodFormatted = `${sd} – ${ed}`;
                    } else {
                      periodFormatted = sd;
                    }
                  } catch { /* */ }
                }
                return (
                  <TableRow
                    key={lead.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selection.isSelected(lead.id) ? "bg-primary/5" : ""}`}
                    onClick={() => setSelected(lead)}
                  >
                    <TableCell className="w-10" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selection.isSelected(lead.id)} onCheckedChange={() => selection.toggle(lead.id)} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={lead.origin === "turista" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          lead.origin === "turista"
                            ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
                            : "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"
                        )}
                      >
                        {lead.origin === "turista" ? "Turista" : "Imersão"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{lead.email || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm"><WhatsAppPhone phone={lead.phone} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    {segment === "b2c" && (
                      <>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.status || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.children || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.mobility || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.groupSize || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{periodFormatted}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.numDays || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.transport || "—")}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{String(answers.hasAccommodation || "—")}</TableCell>
                      </>
                    )}
                    {segment === "b2b" && (
                      <TableCell className="hidden sm:table-cell text-sm">
                        {lead.empresa || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={async () => {
          const ids = [...selection.selectedIds];
          const db = supabase as any;
          if (segment === "b2c") {
            await db.from("quote_requests").delete().in("id", ids);
          } else {
            await db.from("imersao_leads").delete().in("id", ids);
          }
          toast({ title: `${ids.length} solicitação(ões) excluída(s)` });
          selection.clear();
          fetchLeads();
        }}
        onExport={() => {
          const rows = sortedLeads.filter(l => selection.selectedIds.has(l.id));
          const ws = XLSX.utils.json_to_sheet(rows.map(l => ({
            Nome: l.name, Email: l.email, Telefone: l.phone, Status: l.status, Data: l.created_at,
          })));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Solicitações");
          XLSX.writeFile(wb, `solicitacoes-${segment}.xlsx`);
        }}
        bulkFields={[
          ...(segment === "b2c" ? [
            { key: "user_name", label: "Nome", type: "text" as const },
            { key: "user_email", label: "Email", type: "text" as const },
            { key: "user_phone", label: "Telefone", type: "text" as const },
            { key: "status", label: "Status", type: "select" as const, options: [{ value: "pending", label: "Pendente" }, { value: "contacted", label: "Contatado" }, { value: "closed", label: "Encerrado" }, { value: "novo", label: "Novo" }] },
            { key: "language", label: "Idioma", type: "select" as const, options: [{ value: "pt", label: "Português" }, { value: "en", label: "English" }, { value: "es", label: "Español" }] },
          ] : [
            { key: "nome", label: "Nome", type: "text" as const },
            { key: "email", label: "Email", type: "text" as const },
            { key: "telefone", label: "Telefone", type: "text" as const },
            { key: "empresa", label: "Empresa", type: "text" as const },
            { key: "cargo", label: "Cargo", type: "text" as const },
            { key: "tipo_grupo", label: "Tipo Grupo", type: "text" as const },
            { key: "num_participantes", label: "Nº Participantes", type: "text" as const },
            { key: "hospedagem", label: "Hospedagem", type: "text" as const },
            { key: "orcamento", label: "Orçamento", type: "text" as const },
            { key: "status", label: "Status", type: "select" as const, options: [{ value: "pending", label: "Pendente" }, { value: "contacted", label: "Contatado" }, { value: "closed", label: "Encerrado" }, { value: "novo", label: "Novo" }] },
            { key: "language", label: "Idioma", type: "select" as const, options: [{ value: "pt", label: "Português" }, { value: "en", label: "English" }, { value: "es", label: "Español" }] },
            { key: "observacoes", label: "Observações", type: "text" as const },
          ]),
        ]}
        onBulkUpdate={async (field, value) => {
          const ids = [...selection.selectedIds];
          const db = supabase as any;
          if (segment === "b2c") {
            await db.from("quote_requests").update({ [field]: value }).in("id", ids);
          } else {
            await db.from("imersao_leads").update({ [field]: value }).in("id", ids);
          }
          toast({ title: `${ids.length} solicitação(ões) atualizada(s)` });
          selection.clear();
          fetchLeads();
        }}
      />

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2">
                  <SheetTitle>Detalhes da Solicitação</SheetTitle>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      selected.origin === "turista"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-purple-100 text-purple-800 border-purple-200"
                    )}
                  >
                    {selected.origin === "turista" ? "Turista" : "Imersão"}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-accent" />
                  Dados do Cliente
                </div>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Nome: </span>{selected.name || "—"}</div>
                  <div><span className="text-muted-foreground">E-mail: </span>{selected.email || "—"}</div>
                  <div><span className="text-muted-foreground">Telefone: </span>{selected.phone ? <WhatsAppPhone phone={selected.phone} /> : "—"}</div>
                  {selected.origin === "turista" && (
                    <div><span className="text-muted-foreground">Idioma: </span>{(selected.language || "pt").toUpperCase()}</div>
                  )}
                  {selected.origin === "imersao" && (
                    <>
                      <div><span className="text-muted-foreground">Empresa: </span>{selected.empresa || "—"}</div>
                      <div><span className="text-muted-foreground">Cargo: </span>{selected.cargo || "—"}</div>
                      {selected.instagram_site && (
                        <div><span className="text-muted-foreground">Instagram/Site: </span>{selected.instagram_site}</div>
                      )}
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground">Data: </span>
                    {format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>

                {buildWhatsAppUrl(selected) && (
                  <a
                    href={buildWhatsAppUrl(selected)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 justify-center w-full py-2.5 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir WhatsApp
                  </a>
                )}
              </div>

              {/* Pipeline stage tag */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <ClipboardList className="h-4 w-4 text-accent" />
                  Etapa no Pipeline
                </div>
                {loadingStage ? (
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                ) : pipelineStageName ? (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {pipelineStageName}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Sem etapa no pipeline</span>
                )}
              </div>

              {/* Auto-pipeline indicator */}
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
                <ArrowRight className="h-4 w-4 text-accent shrink-0" />
                <span>Este lead já foi enviado automaticamente para o Pipeline {selected.origin === "turista" ? "B2C" : "B2B"} na etapa <strong>Aguardando Orçamento</strong>.</span>
              </div>

              {/* Proposal status indicator */}
              <div className="mb-4 flex items-center gap-2 text-sm bg-muted rounded-lg px-4 py-3">
                <FileText className="h-4 w-4 text-accent shrink-0" />
                {loadingProposal ? (
                  <span className="text-muted-foreground">Verificando proposta...</span>
                ) : linkedProposal ? (
                  <span className="text-foreground">Este cliente já possui uma proposta (<strong>{linkedProposal.code}</strong>).</span>
                ) : (
                  <span className="text-muted-foreground">Cliente sem proposta criada.</span>
                )}
              </div>

              {/* Proposal action buttons */}
              <div className="mb-6 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    if (linkedProposal) {
                      setProposalEditingId(linkedProposal.id);
                      setProposalDialogOpen(true);
                    } else {
                      toast({ title: "Cliente sem proposta criada", description: "Use 'Criar Proposta' para iniciar.", variant: "destructive" });
                    }
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Acessar Proposta
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={async () => {
                    if (!selected) return;
                    // Find or create prospect
                    let prospectIdToUse = linkedProspectId;
                    if (!prospectIdToUse && selected.email) {
                      // create prospect
                      const { data: newProspect } = await (supabase as any)
                        .from("prospects")
                        .insert({
                          name: selected.name || "Lead Site",
                          email: selected.email,
                          phone: selected.phone,
                          segment: selected.origin === "turista" ? "b2c" : "b2b",
                          source: "site",
                          tags: [selected.origin === "turista" ? "turista" : "imersão"],
                        })
                        .select("id")
                        .single();
                      if (newProspect) prospectIdToUse = newProspect.id;
                    }
                    // Pre-fill data
                    const answers = selected.origin === "turista" ? getAnswers(selected) : {};
                    const numPeople = selected.origin === "turista"
                      ? parseInt(String(answers.groupSize)) || 1
                      : parseInt(selected.num_participantes || "1") || 1;
                    const startDateVal = selected.origin === "turista"
                      ? (answers.startDate ? String(answers.startDate) : "")
                      : (selected.data_especifica || "");
                    const endDateVal = selected.origin === "turista"
                      ? (answers.endDate ? String(answers.endDate) : "")
                      : (selected.data_especifica_fim || "");
                    const numDaysVal = selected.origin === "turista"
                      ? parseInt(String(answers.numDays)) || 1
                      : 1;
                    const lang = selected.language || "pt";

                    // Create proposal with pre-filled data
                    const { data: newProp } = await (supabase as any)
                      .from("proposals")
                      .insert({
                        title: `Proposta — ${selected.name || "Lead"}`,
                        segment: selected.origin === "turista" ? "b2c" : "b2b",
                        prospect_id: prospectIdToUse,
                        num_people: numPeople,
                        start_date: startDateVal || null,
                        end_date: endDateVal || null,
                        num_days: numDaysVal,
                        language: lang,
                        status: "draft",
                      })
                      .select("id")
                      .single();

                    if (newProp) {
                      setProposalEditingId(newProp.id);
                      setProposalDialogOpen(true);
                    }
                  }}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Criar Proposta
                </Button>
              </div>

              {/* Imersão-specific details */}
              {selected.origin === "imersao" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                    <Building2 className="h-4 w-4 text-accent" />
                    Detalhes da Imersão
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Tipo de grupo", value: selected.tipo_grupo },
                      { label: "Participantes", value: selected.num_participantes },
                      { label: "Quando", value: selected.quando },
                      { label: "Orçamento", value: selected.orcamento },
                      { label: "Hospedagem", value: selected.hospedagem },
                      { label: "Experiência com grupos", value: selected.experiencia_grupos },
                      { label: "Conhece a Chapada", value: selected.conhece_chapada },
                      { label: "Como conheceu", value: selected.como_conheceu },
                    ].filter(f => f.value).map((field) => (
                      <div key={field.label} className="text-sm bg-muted rounded px-3 py-2">
                        <span className="text-muted-foreground text-xs">{field.label}: </span>
                        <span className="text-foreground">{field.value}</span>
                      </div>
                    ))}
                    {selected.data_especifica && (
                      <div className="text-sm bg-muted rounded px-3 py-2">
                        <span className="text-muted-foreground text-xs">Datas: </span>
                        <span className="text-foreground">
                          {format(new Date(selected.data_especifica), "dd/MM/yyyy", { locale: ptBR })}
                          {selected.data_especifica_fim && ` — ${format(new Date(selected.data_especifica_fim), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                      </div>
                    )}
                    {Array.isArray(selected.objetivos) && (selected.objetivos as string[]).length > 0 && (
                      <div className="text-sm bg-muted rounded px-3 py-2">
                        <span className="text-muted-foreground text-xs">Objetivos: </span>
                        <span className="text-foreground">{(selected.objetivos as string[]).join(", ")}</span>
                      </div>
                    )}
                    {selected.observacoes && (
                      <div className="text-sm bg-muted rounded px-3 py-2">
                        <span className="text-muted-foreground text-xs">Observações: </span>
                        <span className="text-foreground">{selected.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Turista-specific: Wishlist items */}
              {selected.origin === "turista" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                    <Package className="h-4 w-4 text-accent" />
                    Itens da Wishlist
                  </div>
                  {Object.entries(groupedItems(selected)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedItems(selected)).map(([type, items]) => (
                        <div key={type}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{type}</p>
                          <div className="space-y-1">
                            {items.map((item, i) => (
                              <div key={i} className="text-sm bg-muted rounded px-3 py-1.5">
                                {item.name}
                                {item.details && <span className="text-muted-foreground"> — {item.details}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Turista-specific: Questionnaire answers */}
              {selected.origin === "turista" && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                    <ClipboardList className="h-4 w-4 text-accent" />
                    Respostas do Questionário
                  </div>
                  {Object.keys(getAnswers(selected)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem respostas.</p>
                  ) : (
                    <div className="space-y-2">
                      {answerKeyOrder.map((key) => {
                        const allAnswers = getAnswers(selected);
                        const value = allAnswers[key];
                        if (!value) return null;
                        const displayValue =
                          (key === "startDate" || key === "endDate")
                            ? format(new Date(String(value)), "dd/MM/yyyy", { locale: ptBR })
                            : String(value);
                        return (
                          <div key={key} className="text-sm bg-muted rounded px-3 py-2">
                            <span className="text-muted-foreground text-xs">{answerLabels[key] || key}: </span>
                            <span className="text-foreground">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <ProposalFormDialog
        open={proposalDialogOpen}
        onOpenChange={setProposalDialogOpen}
        proposalId={proposalEditingId}
        segment={segment}
      />
    </div>
  );
}
