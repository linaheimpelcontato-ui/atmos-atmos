import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Star, Download, Globe, RotateCcw, X } from "lucide-react";
import { format } from "date-fns";
import ProspectDetailDialog from "@/components/admin/ProspectDetailDialog";
import { toast } from "@/hooks/use-toast";
import { SortableSmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import { useHiddenColumns, HiddenColumnsButton } from "@/hooks/useHiddenColumns";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface AdminProspectsProps {
  segment: "b2c" | "b2b";
}

const SOURCE_LABELS: Record<string, string> = {
  site: "Site", whatsapp: "WhatsApp", manychat: "ManyChat", manual: "Manual", import: "Importação",
};

const SOURCE_COLORS: Record<string, string> = {
  site: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  manychat: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  manual: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  import: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const POTENTIAL_LABELS: Record<string, string> = {
  high: "Alto", medium: "Médio", low: "Baixo",
};
const POTENTIAL_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta", medium: "Média", low: "Baixa",
};

function PriorityStars({ priority }: { priority: string | null }) {
  const score = priority === "high" ? 5 : priority === "low" ? 1 : 3;
  return (
    <div className="flex gap-0">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// ─── Column definitions ─────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  b2bOnly?: boolean;
  b2cOnly?: boolean;
  labelMap?: Record<string, string>;
  valueExtractor?: (row: Record<string, unknown>) => unknown;
  render: (row: Record<string, unknown>, stages: { id: string; name: string }[]) => React.ReactNode;
}

const COLUMN_DEFS: ColumnDef[] = [
  // 1. Nome
  {
    key: "name", label: "Nome",
    render: (p) => <span className="font-medium">{p.name as string}</span>,
  },
  // 2. Empresa (B2B)
  {
    key: "company_name", label: "Empresa", b2bOnly: true,
    render: (p) => <span className="text-xs">{(p.company_name as string) ?? "—"}</span>,
  },
  // 3. Data Entrada
  {
    key: "created_at", label: "Entrada",
    render: (p) => <span className="text-xs text-muted-foreground">{p.created_at ? format(new Date(p.created_at as string), "dd/MM/yy") : "—"}</span>,
  },
  // 4. Origem
  {
    key: "source", label: "Origem", labelMap: SOURCE_LABELS,
    render: (p) => (
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[p.source as string] ?? SOURCE_COLORS.manual}`}>
        {SOURCE_LABELS[p.source as string] ?? (p.source as string)}
      </span>
    ),
  },
  // 5. Tags
  {
    key: "tags", label: "Tags",
    valueExtractor: (row) => ((row.tags as string[]) ?? []).join(", "),
    render: (p) => (
      <div className="flex gap-1 flex-wrap">
        {((p.tags as string[]) ?? []).slice(0, 3).map((t: string) => (
          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
        ))}
      </div>
    ),
  },
  // 6. Etapa
  {
    key: "stage_id", label: "Etapa",
    render: (p, stages) => {
      const name = stages.find(s => s.id === p.stage_id)?.name ?? "—";
      return <Badge variant="outline" className="text-xs">{name}</Badge>;
    },
  },
  // 7. Nº Propostas
  {
    key: "_proposal_count", label: "Nº Propostas",
    valueExtractor: (row) => (row as any)._proposal_count ?? 0,
    render: (p) => <span className="text-xs text-center block">{(p as any)._proposal_count ?? 0}</span>,
  },
  // 8. Propostas (tags)
  {
    key: "_proposals_tags", label: "Propostas",
    valueExtractor: (row) => ((row as any)._proposals ?? []).map((p: any) => p.code).join(", "),
    render: (p) => {
      const proposals = (p as any)._proposals as { code: string; status: string }[] ?? [];
      if (proposals.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="flex gap-1 flex-wrap">
          {proposals.map((pr) => (
            <Badge key={pr.code} variant={pr.status === "accepted" ? "default" : "outline"} className="text-[10px]">
              {pr.code}
            </Badge>
          ))}
        </div>
      );
    },
  },
  // 9. Valor Propostas
  {
    key: "_proposal_total", label: "Valor Propostas",
    valueExtractor: (row) => (row as any)._proposal_total ?? 0,
    render: (p) => {
      const val = (p as any)._proposal_total ?? 0;
      return <span className="text-xs">{val > 0 ? `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—"}</span>;
    },
  },
  // 10. Última Proposta
  {
    key: "_last_proposal", label: "Última Proposta",
    valueExtractor: (row) => (row as any)._last_proposal_title ?? "",
    render: (p) => {
      const title = (p as any)._last_proposal_title;
      const status = (p as any)._last_proposal_status;
      if (!title) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className="text-xs">
          {title} <Badge variant="outline" className="text-[9px] ml-1">{status}</Badge>
        </span>
      );
    },
  },
  // 11. Último Contato
  {
    key: "last_interaction", label: "Último Contato",
    render: (p) => <span className="text-xs text-muted-foreground">{p.last_interaction ? format(new Date(p.last_interaction as string), "dd/MM/yy") : "—"}</span>,
  },
  // 12. Próx. Follow-up
  {
    key: "next_followup_at", label: "Próx. Follow-up",
    render: (p) => <span className="text-xs text-muted-foreground">{p.next_followup_at ? format(new Date(p.next_followup_at as string), "dd/MM/yy") : "—"}</span>,
  },
  // 13. Nº Contatos
  {
    key: "_contact_count", label: "Nº Contatos",
    valueExtractor: (row) => (row as any)._contact_count ?? 0,
    render: (p) => <span className="text-xs text-center block">{(p as any)._contact_count ?? 0}</span>,
  },
  // 14. Contato Principal
  {
    key: "_primary_contact", label: "Contato Principal",
    valueExtractor: (row) => (row as any)._primary_contact ?? "",
    render: (p) => <span className="text-xs">{(p as any)._primary_contact || "—"}</span>,
  },
  // 15. Telefone
  {
    key: "phone", label: "Telefone",
    render: (p) => p.phone ? <WhatsAppPhone phone={p.phone as string} /> : <span className="text-xs text-muted-foreground">—</span>,
  },
  // 16. Vendedor
  {
    key: "seller_name", label: "Vendedor",
    valueExtractor: (row) => (row as any).sellers?.name ?? "",
    render: (p) => <span className="text-xs text-muted-foreground">{(p as any).sellers?.name || "—"}</span>,
  },
  // 17. Potencial
  {
    key: "potential", label: "Potencial", labelMap: POTENTIAL_LABELS,
    render: (p) => POTENTIAL_LABELS[p.potential as string] ? (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${POTENTIAL_COLORS[p.potential as string]}`}>
        {POTENTIAL_LABELS[p.potential as string]}
      </span>
    ) : <span className="text-xs text-muted-foreground">—</span>,
  },
  // 18. Prioridade
  {
    key: "priority", label: "Prioridade", labelMap: PRIORITY_LABELS,
    render: (p) => <PriorityStars priority={p.priority as string | null} />,
  },
  // 19. Nascimento
  {
    key: "birth_date", label: "Nascimento",
    render: (p) => <span className="text-xs">{p.birth_date ? format(new Date(p.birth_date as string), "dd/MM/yy") : "—"}</span>,
  },
  // 20. Instagram
  {
    key: "instagram", label: "Instagram",
    render: (p) => <span className="text-xs">{(p.instagram as string) ?? "—"}</span>,
  },
  // 21. LinkedIn
  {
    key: "linkedin", label: "LinkedIn",
    render: (p) => p.linkedin ? (
      <a href={p.linkedin as string} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline text-xs">Link</a>
    ) : <span className="text-xs text-muted-foreground">—</span>,
  },
  // 22. Email
  {
    key: "email", label: "Email",
    render: (p) => <span className="text-xs">{(p.email as string) ?? "—"}</span>,
  },
  // 23. Documento
  {
    key: "document", label: "Documento",
    render: (p) => <span className="text-xs">{(p.document as string) ?? "—"}</span>,
  },
  // 24. Notas
  {
    key: "notes", label: "Notas",
    render: (p) => <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{(p.notes as string) ?? "—"}</span>,
  },
  // 25-28. B2B only extras
  {
    key: "country", label: "País", b2bOnly: true,
    render: (p) => <span className="text-xs">{(p.country as string) ?? "—"}</span>,
  },
  {
    key: "company_type", label: "Tipo Empresa", b2bOnly: true,
    render: (p) => <span className="text-xs text-muted-foreground">{(p.company_type as string) ?? "—"}</span>,
  },
  {
    key: "company_segment", label: "Segmento Empresa", b2bOnly: true,
    render: (p) => <span className="text-xs text-muted-foreground">{(p.company_segment as string) ?? "—"}</span>,
  },
  {
    key: "website", label: "Website", b2bOnly: true,
    render: (p) => p.website ? (
      <a href={p.website as string} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline text-xs flex items-center gap-1">
        <Globe className="h-3 w-3" /> Link
      </a>
    ) : <span className="text-xs text-muted-foreground">—</span>,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function getDefaultColumns(segment: "b2c" | "b2b"): string[] {
  return COLUMN_DEFS
    .filter(c => {
      if (segment === "b2c" && c.b2bOnly) return false;
      if (segment === "b2b" && c.b2cOnly) return false;
      return true;
    })
    .map(c => c.key);
}

const COLS_VERSION = 2;
function getStorageKey(segment: string) {
  return `admin-cols-${segment}-v${COLS_VERSION}`;
}

// ─── Component ──────────────────────────────────────────────────────

export default function AdminProspects({ segment }: AdminProspectsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prospects, setProspects] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const filterState = useSmartFilters();
  const selection = useRowSelection();

  const isB2B = segment === "b2b";

  // Column order
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(segment));
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return getDefaultColumns(segment);
  });

  // Sync column order to localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey(segment), JSON.stringify(columnOrder));
  }, [columnOrder, segment]);

  // Hidden columns
  const { hiddenColumns, hideColumn, showColumn, showAll: showAllColumns } = useHiddenColumns(`admin-hidden-cols-${segment}`);

  // When segment changes, reset column order
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(segment));
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumnOrder(parsed);
          return;
        }
      }
    } catch { /* ignore */ }
    setColumnOrder(getDefaultColumns(segment));
  }, [segment]);

  // Available columns filtered by segment
  const availableColumns = useMemo(() => {
    return COLUMN_DEFS.filter(c => {
      if (segment === "b2c" && c.b2bOnly) return false;
      if (segment === "b2b" && c.b2cOnly) return false;
      return true;
    });
  }, [segment]);

  // Ordered column defs based on columnOrder, excluding hidden
  const orderedColumns = useMemo(() => {
    const colMap = new Map(availableColumns.map(c => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of columnOrder) {
      if (hiddenColumns.has(key)) continue;
      const col = colMap.get(key);
      if (col) {
        ordered.push(col);
        colMap.delete(key);
      }
    }
    for (const col of colMap.values()) {
      if (!hiddenColumns.has(col.key)) ordered.push(col);
    }
    return ordered;
  }, [columnOrder, availableColumns, hiddenColumns]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const resetColumns = useCallback(() => {
    const defaults = getDefaultColumns(segment);
    setColumnOrder(defaults);
    showAllColumns();
  }, [segment, showAllColumns]);

  // ─── Data fetching ──────────────────────────────────────────────────

  const fetchStages = useCallback(async () => {
    const { data } = await db.from("pipeline_stages").select("*").eq("segment", segment).order("position");
    setStages(data ?? []);
  }, [segment]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    // Main prospects query
    const { data: prospectData } = await db
      .from("prospects")
      .select("*, sellers(name)")
      .eq("segment", segment)
      .order("created_at", { ascending: false });

    const rawProspects = prospectData ?? [];
    if (rawProspects.length === 0) {
      setProspects([]);
      setLoading(false);
      return;
    }

    const ids = rawProspects.map((p: any) => p.id);

    // Batch fetch contacts & proposals in parallel
    const [contactsRes, proposalsRes] = await Promise.all([
      db.from("contacts").select("prospect_id, name").in("prospect_id", ids),
      db.from("proposals").select("prospect_id, title, status, total, code").in("prospect_id", ids).order("created_at", { ascending: false }),
    ]);

    // Aggregate contacts
    const contactMap = new Map<string, { count: number; primary: string }>();
    (contactsRes.data ?? []).forEach((c: any) => {
      const existing = contactMap.get(c.prospect_id);
      if (existing) {
        existing.count++;
      } else {
        contactMap.set(c.prospect_id, { count: 1, primary: c.name });
      }
    });

    // Aggregate proposals
    const proposalMap = new Map<string, { count: number; total: number; lastTitle: string; lastStatus: string; proposals: { code: string; status: string }[] }>();
    (proposalsRes.data ?? []).forEach((pr: any) => {
      const existing = proposalMap.get(pr.prospect_id);
      if (existing) {
        existing.count++;
        existing.total += Number(pr.total) || 0;
        existing.proposals.push({ code: pr.code ?? "—", status: pr.status });
      } else {
        proposalMap.set(pr.prospect_id, {
          count: 1,
          total: Number(pr.total) || 0,
          lastTitle: pr.title,
          lastStatus: pr.status,
          proposals: [{ code: pr.code ?? "—", status: pr.status }],
        });
      }
    });

    // Enrich prospects
    const enriched = rawProspects.map((p: any) => {
      const contact = contactMap.get(p.id);
      const proposal = proposalMap.get(p.id);
      return {
        ...p,
        _contact_count: contact?.count ?? 0,
        _primary_contact: contact?.primary ?? "",
        _proposal_count: proposal?.count ?? 0,
        _proposal_total: proposal?.total ?? 0,
        _last_proposal_title: proposal?.lastTitle ?? "",
        _last_proposal_status: proposal?.lastStatus ?? "",
        _proposals: proposal?.proposals ?? [],
      };
    });

    setProspects(enriched);
    setLoading(false);
  }, [segment]);

  useEffect(() => { fetchStages(); }, [fetchStages]);
  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  // ─── Filtering ────────────────────────────────────────────────────

  // Build value extractors from column defs
  const valueExtractors = useMemo(() => {
    const extractors: Record<string, (row: any) => unknown> = {};
    COLUMN_DEFS.forEach(col => {
      if (col.valueExtractor) {
        extractors[col.key] = col.valueExtractor;
      }
    });
    return extractors;
  }, []);

  const filtered = useMemo(() => {
    let result = prospects;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p: Record<string, unknown>) =>
        [p.name, p.email, p.phone, p.company_name, p.country, p.company_type, p.target_market, p.document, p.instagram, (p as any)._primary_contact, ...(p.tags as string[] ?? [])]
          .some(v => v && String(v).toLowerCase().includes(s))
      );
    }
    return filterState.applyFilters(result, valueExtractors);
  }, [prospects, search, filterState, valueExtractors]);

  // ─── Actions ──────────────────────────────────────────────────────

  const handleCreateAndOpen = async () => {
    const { data, error } = await db.from("prospects")
      .insert({ name: "Novo Cliente", segment })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    } else if (data) {
      setSelectedProspectId(data.id);
      fetchProspects();
    }
  };

  const exportCSV = () => {
    const headers = orderedColumns.map(c => c.label);
    const rows = filtered.map((p: Record<string, unknown>) =>
      orderedColumns.map(col => {
        const extractor = col.valueExtractor;
        const val = extractor ? extractor(p) : p[col.key];
        if (col.key === "stage_id") return stages.find((s: any) => s.id === val)?.name ?? "";
        if (col.key === "tags") return ((p.tags as string[]) ?? []).join("; ");
        return val == null ? "" : String(val);
      })
    );
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${segment}.csv`;
    a.click();
    URL.revokeObjectURL(url);
   };

  // ─── Bulk actions ─────────────────────────────────────────────────
  const allIds = useMemo(() => filtered.map((p: any) => p.id as string), [filtered]);

  const bulkFields: BulkField[] = useMemo(() => {
    const fields: BulkField[] = [
      { key: "name", label: "Nome", type: "text" },
      { key: "company_name", label: "Empresa", type: "text" },
      { key: "source", label: "Origem", type: "select", options: [{ value: "site", label: "Site" }, { value: "whatsapp", label: "WhatsApp" }, { value: "manychat", label: "ManyChat" }, { value: "manual", label: "Manual" }, { value: "import", label: "Importação" }] },
    ];
    if (stages.length > 0) {
      fields.push({ key: "stage_id", label: "Etapa", type: "select", options: stages.map((s: any) => ({ value: s.id, label: s.name })) });
    }
    fields.push(
      { key: "potential", label: "Potencial", type: "select", options: [{ value: "high", label: "Alto" }, { value: "medium", label: "Médio" }, { value: "low", label: "Baixo" }] },
      { key: "priority", label: "Prioridade", type: "select", options: [{ value: "high", label: "Alta" }, { value: "medium", label: "Média" }, { value: "low", label: "Baixa" }] },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "birth_date", label: "Data Nasc. (AAAA-MM-DD)", type: "text" },
      { key: "instagram", label: "Instagram", type: "text" },
      { key: "linkedin", label: "LinkedIn", type: "text" },
      { key: "document", label: "Documento", type: "text" },
      { key: "notes", label: "Observações", type: "text" },
      { key: "country", label: "País", type: "text" },
      { key: "company_type", label: "Tipo Empresa", type: "text" },
      { key: "company_segment", label: "Segmento Empresa", type: "text" },
      { key: "website", label: "Website", type: "text" },
    );
    return fields;
  }, [stages]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds];
    await db.from("prospects").delete().in("id", ids);
    toast({ title: `${ids.length} cliente(s) excluído(s)` });
    selection.clear();
    fetchProspects();
  };

  const handleBulkExport = () => {
    const rows = filtered.filter((p: any) => selection.selectedIds.has(p.id));
    const ws = XLSX.utils.json_to_sheet(rows.map((p: any) => {
      const obj: Record<string, unknown> = {};
      orderedColumns.forEach(col => {
        const ext = col.valueExtractor;
        obj[col.label] = ext ? ext(p) : p[col.key];
      });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes-${segment}.xlsx`);
  };

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const ids = [...selection.selectedIds];
    await db.from("prospects").update({ [field]: value }).in("id", ids);
    toast({ title: `${ids.length} cliente(s) atualizado(s)` });
    selection.clear();
    fetchProspects();
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 min-w-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-admin-primary">
            Clientes {segment === "b2c" ? "B2C" : "B2B"}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Gestão estratégica de base de leads e clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={resetColumns} className="rounded-xl font-bold text-xs border-admin-border/60 hover:bg-admin-muted">
            <RotateCcw className="h-3.5 w-3.5 mr-2 opacity-60" /> Resetar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl font-bold text-xs border-admin-border/60 hover:bg-admin-muted">
            <Download className="h-3.5 w-3.5 mr-2 opacity-60" /> Exportar
          </Button>
          <Button onClick={handleCreateAndOpen} size="sm" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-6 shadow-xl shadow-admin-primary/20 bg-admin-primary hover:bg-admin-primary/90">
            <Plus className="h-3.5 w-3.5 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar nome, email, telefone, tags..." 
            className="pl-12 h-12 bg-transparent border-none focus-visible:ring-0 text-base font-semibold placeholder:text-muted-foreground/30" 
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <HiddenColumnsButton
            columns={availableColumns.map(c => ({ key: c.key, label: c.label }))}
            hiddenColumns={hiddenColumns}
            showColumn={showColumn}
            showAll={showAllColumns}
          />
          {Object.keys(filterState.filters).length > 0 && (
            <Button variant="ghost" size="sm" className="h-10 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/5" onClick={filterState.clearAll}>
              <X className="h-3.5 w-3.5 mr-2" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        {loading ? (
          <div className="py-24 text-center">
            <RotateCcw className="h-8 w-8 text-admin-primary/20 animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Carregando base de clientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Search className="h-8 w-8 text-admin-primary/20 mx-auto mb-4" />
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] overscroll-x-contain scrollbar-thin scrollbar-thumb-admin-border/40 scrollbar-track-transparent">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-admin-border/40">
                  <SortableContext items={orderedColumns.map(c => c.key)} strategy={horizontalListSortingStrategy}>
                    <TableRow className="hover:bg-transparent border-none">
                      <th className="p-6 w-12 text-center bg-transparent">
                        <Checkbox
                          checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))}
                          onCheckedChange={() => selection.toggleAll(allIds)}
                          className="rounded-md border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                        />
                      </th>
                      {orderedColumns.map(col => (
                        <SortableSmartTableHead
                          key={col.key}
                          id={col.key}
                          label={col.label}
                          sortKey={col.key}
                          filterState={filterState}
                          data={filtered}
                          valueExtractor={col.valueExtractor as any}
                          labelMap={col.labelMap}
                          onHide={() => hideColumn(col.key)}
                        />
                      ))}
                    </TableRow>
                  </SortableContext>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: Record<string, unknown>) => (
                    <TableRow 
                      key={p.id as string} 
                      className={`group cursor-pointer transition-colors duration-200 border-b border-admin-border/20 ${selection.isSelected(p.id as string) ? "bg-admin-primary/[0.03]" : "hover:bg-admin-muted/40"}`}
                    >
                      <TableCell className="w-12 text-center p-6" onClick={e => e.stopPropagation()}>
                        <Checkbox 
                          checked={selection.isSelected(p.id as string)} 
                          onCheckedChange={() => selection.toggle(p.id as string)} 
                          className="rounded-md border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                        />
                      </TableCell>
                      {orderedColumns.map(col => (
                        <TableCell key={col.key} className="text-nowrap p-6" onClick={() => setSelectedProspectId(p.id as string)}>
                          {col.render(p, stages)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DndContext>
        )}
      </div>

      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        bulkFields={bulkFields}
        onBulkUpdate={handleBulkUpdate}
      />

      <ProspectDetailDialog
        open={!!selectedProspectId}
        onOpenChange={open => { if (!open) setSelectedProspectId(null); }}
        prospectId={selectedProspectId}
        stages={stages}
        segment={segment}
        onUpdated={fetchProspects}
      />
    </motion.div>
  );
}
