import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, FileText, Eye, Trash2, Copy, Check, ExternalLink, Pencil, MessageCircle, HelpCircle, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import ProposalFormDialog from "@/components/admin/ProposalFormDialog";
import { SmartTh, useSmartFilters } from "@/components/admin/SmartTableHead";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";
import { useRowSelection } from "@/hooks/useRowSelection";
import BulkActionBar, { type BulkField } from "@/components/admin/BulkActionBar";
import * as XLSX from "xlsx";

const db = supabase as any;

type Proposal = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  contract_status: string | null;
  payment_status: string | null;
  segment: string;
  subtotal: number;
  discount_percent: number;
  discount_fixed: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  prospect_id: string | null;
  seller_id: string | null;
  share_token: string | null;
  slug: string | null;
  language: string;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  prospect_name?: string;
  prospect_phone?: string;
  seller_name?: string;
  prospects?: { name: string; phone: string | null } | null;
  sellers?: { name: string } | null;
};

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  prospect_id: string;
};

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-800" },
  negotiating: { label: "Negociando", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprovada", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejeitada", color: "bg-red-100 text-red-800" },
  expired: { label: "Expirada", color: "bg-gray-100 text-gray-600" },
};

const contractStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Contrato Pendente", color: "bg-muted text-muted-foreground" },
  sent: { label: "Contrato Enviado", color: "bg-blue-100 text-blue-800" },
  signed: { label: "Contrato Assinado", color: "bg-emerald-100 text-emerald-800" },
};

const paymentStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pgto Pendente", color: "bg-muted text-muted-foreground" },
  partial: { label: "Pgto Parcial", color: "bg-amber-100 text-amber-800" },
  paid: { label: "Pago", color: "bg-emerald-200 text-emerald-900" },
};

function getProposalLink(p: Proposal) {
  const key = p.slug || p.share_token;
  return key ? `${window.location.origin}/proposta/${key}` : null;
}

function getProposalPath(p: Proposal) {
  return `/proposta/${p.slug || p.share_token}`;
}

function WhatsAppButton({ proposal, prospectPhone, prospectId }: { proposal: Proposal; prospectPhone: string | null; prospectId: string | null }) {
  const link = getProposalLink(proposal);
  if (!link || !prospectId) return null;

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["prospect-contacts-phones", prospectId],
    queryFn: async () => {
      const { data } = await db.from("contacts").select("id, name, phone, prospect_id").eq("prospect_id", prospectId);
      return (data || []).filter((c: Contact) => c.phone);
    },
    enabled: !!prospectId,
  });

  const allPhones: { name: string; phone: string }[] = [];
  if (prospectPhone) {
    allPhones.push({ name: proposal.prospect_name || "Prospect", phone: prospectPhone });
  }
  contacts.forEach(c => {
    if (c.phone && !allPhones.some(p => p.phone.replace(/\D/g, "") === c.phone!.replace(/\D/g, ""))) {
      allPhones.push({ name: c.name, phone: c.phone });
    }
  });

  if (allPhones.length === 0) return null;

  const buildWaUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Segue a proposta "${proposal.title}": ${link}`);
    return `https://wa.me/${digits}?text=${msg}`;
  };

  if (allPhones.length === 1) {
    return (
      <Button size="icon" variant="ghost" asChild title={`WhatsApp: ${allPhones[0].name}`}>
        <a href={buildWaUrl(allPhones[0].phone)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
        </a>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" title="Enviar via WhatsApp" onClick={e => e.stopPropagation()}>
          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-1">Enviar para:</p>
        {allPhones.map((p, i) => (
          <a
            key={i}
            href={buildWaUrl(p.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <MessageCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <div className="min-w-0">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.phone}</span>
            </div>
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function AdminProposals({ segment }: { segment: "b2c" | "b2b" }) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialProspectId, setInitialProspectId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filterState = useSmartFilters();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns(`admin-hidden-cols-proposals-${segment}`);
  const selection = useRowSelection();

  const { data: awaitingProspects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["awaiting-proposal-prospects", segment],
    queryFn: async () => {
      const { data: stage } = await db
        .from("pipeline_stages")
        .select("id")
        .eq("segment", segment)
        .ilike("name", "%Aguardando Orçamento%")
        .single();
      if (!stage) return [];
      const { data } = await db
        .from("prospects")
        .select("id, name")
        .eq("stage_id", stage.id)
        .order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const { data: feedbackGroups = { changes: [], questions: [] } } = useQuery<{
    changes: { proposal_id: string; proposal_title: string; count: number; messages: { id: string; content: string; created_at: string }[] }[];
    questions: { proposal_id: string; proposal_title: string; count: number; messages: { id: string; content: string; created_at: string }[] }[];
  }>({
    queryKey: ["pill-feedback-groups", segment],
    queryFn: async () => {
      const { data: segProposals } = await db
        .from("proposals")
        .select("id, title")
        .eq("segment", segment);
      if (!segProposals || segProposals.length === 0) return { changes: [], questions: [] };
      const proposalMap = Object.fromEntries((segProposals as any[]).map((p: any) => [p.id, p.title]));
      const proposalIds = Object.keys(proposalMap);

      const { data: fb } = await db
        .from("proposal_feedback")
        .select("id, proposal_id, type, content, created_at")
        .in("proposal_id", proposalIds)
        .eq("is_resolved", false)
        .order("created_at", { ascending: true });
      if (!fb) return { changes: [], questions: [] };

      const changesMap: Record<string, { count: number; messages: { id: string; content: string; created_at: string }[] }> = {};
      const questionsMap: Record<string, { count: number; messages: { id: string; content: string; created_at: string }[] }> = {};
      (fb as any[]).forEach((r: any) => {
        const target = r.type === "change_request" ? changesMap : questionsMap;
        if (!target[r.proposal_id]) target[r.proposal_id] = { count: 0, messages: [] };
        target[r.proposal_id].count += 1;
        target[r.proposal_id].messages.push({ id: r.id, content: r.content, created_at: r.created_at });
      });

      return {
        changes: Object.entries(changesMap).map(([pid, v]) => ({ proposal_id: pid, proposal_title: proposalMap[pid] || "", ...v })),
        questions: Object.entries(questionsMap).map(([pid, v]) => ({ proposal_id: pid, proposal_title: proposalMap[pid] || "", ...v })),
      };
    },
  });

  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  // Handle ?edit= query param from pipeline navigation
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam) {
      setEditingId(editParam);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["admin-proposals", segment],
    queryFn: async () => {
      const { data, error } = await db
        .from("proposals")
        .select("*, prospects(name, phone), sellers(name), guides:guide_id(name)")
        .eq("segment", segment)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        prospect_name: p.prospects?.name || "",
        prospect_phone: p.prospects?.phone || "",
        seller_name: p.sellers?.name || "",
        guide_name: p.guides?.name || "-",
      }));
    },
  });

  // ── Alert counts ──
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const alertCounts = useMemo(() => {
    const approvedNoDate = proposals.filter(p => p.status === "approved" && !p.start_date).length;
    const approvedNoContract = proposals.filter(p => p.status === "approved" && !p.contract_status).length;
    const signedNoPayment = proposals.filter(p => p.contract_status === "signed" && !p.payment_status).length;
    const sentNoReturn = proposals.filter(p => p.status === "sent" && p.updated_at && new Date(p.updated_at) < sevenDaysAgo).length;
    const contractSentNotSigned = proposals.filter(p => p.contract_status === "sent").length;
    const partialPayment = proposals.filter(p => p.payment_status === "partial").length;
    const expired = proposals.filter(p => p.valid_until && new Date(p.valid_until) < now && !["approved", "rejected", "expired"].includes(p.status)).length;
    return { approvedNoDate, approvedNoContract, signedNoPayment, sentNoReturn, contractSentNotSigned, partialPayment, expired };
  }, [proposals]);

  const totalAlertCount = Object.values(alertCounts).reduce((s, v) => s + v, 0);

  const totalPillCount = awaitingProspects.length + feedbackGroups.changes.reduce((s, f) => s + f.count, 0) + feedbackGroups.questions.reduce((s, f) => s + f.count, 0) + totalAlertCount;

  // Feedback counts per proposal
  const { data: feedbackCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["proposal-feedback-counts", segment],
    queryFn: async () => {
      const { data } = await db.from("proposal_feedback").select("proposal_id").eq("is_resolved", false);
      if (!data) return {};
      const counts: Record<string, number> = {};
      (data as { proposal_id: string }[]).forEach(r => {
        counts[r.proposal_id] = (counts[r.proposal_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-proposals", segment] });
      toast({ title: "Proposta removida" });
    },
  });

  const filtered = useMemo(() => {
    let result = proposals.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.prospect_name?.toLowerCase().includes(search.toLowerCase()) && !(p.code || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
    return filterState.applyFilters(result);
  }, [proposals, search, filterStatus, filterState]);

  const allIds = useMemo(() => filtered.map(p => p.id), [filtered]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds];
    for (const id of ids) await supabase.from("proposals").delete().eq("id", id);
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-proposals", segment] });
    toast({ title: `${ids.length} proposta(s) removida(s)` });
  };

  const handleBulkExport = () => {
    const rows = filtered.filter(p => selection.selectedIds.has(p.id)).map(p => ({
      Código: p.code, Título: p.title, Prospect: p.prospect_name, Vendedor: p.seller_name,
      Status: statusMap[p.status]?.label || p.status, "Total R$": p.total,
      Validade: p.valid_until || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Propostas");
    XLSX.writeFile(wb, `propostas-${segment}.xlsx`);
  };

  const BULK_FIELDS: BulkField[] = [
    { key: "title", label: "Título", type: "text" },
    { key: "status", label: "Status", type: "select", options: Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label })) },
    { key: "valid_until", label: "Validade (AAAA-MM-DD)", type: "text" },
    { key: "language", label: "Idioma", type: "select", options: [{ value: "pt", label: "Português" }, { value: "en", label: "English" }, { value: "es", label: "Español" }] },
    { key: "discount_percent", label: "Desconto (%)", type: "number" },
    { key: "discount_fixed", label: "Desconto Fixo (R$)", type: "number" },
    { key: "tax_percent", label: "Imposto (%)", type: "number" },
    { key: "notes", label: "Observações", type: "text" },
  ];

  const handleBulkDuplicate = async () => {
    const ids = [...selection.selectedIds];
    let count = 0;
    for (const id of ids) {
      const { data: orig } = await db.from("proposals").select("*").eq("id", id).single();
      if (!orig) continue;
      const { id: _id, code: _code, slug: _slug, share_token: _st, created_at: _ca, updated_at: _ua, published_at: _pa, ...rest } = orig as any;
      const { data: newP } = await db.from("proposals").insert({ ...rest, title: `Cópia — ${orig.title}`, status: "draft", published_at: null, code: null, slug: null }).select("id").single();
      if (!newP) continue;
      const newId = (newP as any).id;
      // Copy day items
      const { data: dayItems } = await db.from("proposal_day_items").select("*").eq("proposal_id", id);
      if (dayItems && dayItems.length > 0) {
        const cloned = (dayItems as any[]).map(({ id: _did, created_at: _dca, proposal_id: _pid, ...r }: any) => ({ ...r, proposal_id: newId }));
        await db.from("proposal_day_items").insert(cloned);
      }
      // Copy days
      const { data: days } = await db.from("proposal_days").select("*").eq("proposal_id", id);
      if (days && days.length > 0) {
        const cloned = (days as any[]).map(({ id: _did, created_at: _dca, proposal_id: _pid, ...r }: any) => ({ ...r, proposal_id: newId }));
        await db.from("proposal_days").insert(cloned);
      }
      // Copy costs
      const { data: costs } = await db.from("proposal_costs").select("*").eq("proposal_id", id);
      if (costs && costs.length > 0) {
        const cloned = (costs as any[]).map(({ id: _did, created_at: _dca, proposal_id: _pid, ...r }: any) => ({ ...r, proposal_id: newId }));
        await db.from("proposal_costs").insert(cloned);
      }

      // Copy accommodations
      const { data: accommodations } = await db.from("proposal_accommodations").select("*").eq("proposal_id", id);
      if (accommodations && accommodations.length > 0) {
        const cloned = (accommodations as any[]).map(({ id: _aid, created_at: _aca, proposal_id: _pid, ...r }: any) => ({ ...r, proposal_id: newId }));
        await db.from("proposal_accommodations").insert(cloned);
      }

      // Copy cost checks (roteiro + hospedagem)
      const { data: checks } = await db.from("proposal_cost_checks").select("*").eq("proposal_id", id);
      if (checks && checks.length > 0) {
        const cloned = (checks as any[]).map(({ id: _cid, created_at: _cca, updated_at: _cua, proposal_id: _pid, ...r }: any) => ({
          ...r,
          proposal_id: newId,
          is_verified: false,
        }));
        await db.from("proposal_cost_checks").insert(cloned);
      }
      count++;
    }
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-proposals", segment] });
    toast({ title: `${count} proposta(s) duplicada(s)` });
  };

  const handleBulkUpdate = async (field: string, value: unknown) => {
    const ids = [...selection.selectedIds];
    const parsed = ["discount_percent", "discount_fixed", "tax_percent"].includes(field) ? (parseFloat(String(value)) || 0) : value;
    for (const id of ids) await supabase.from("proposals").update({ [field]: parsed }).eq("id", id);
    selection.clear();
    qc.invalidateQueries({ queryKey: ["admin-proposals", segment] });
    toast({ title: `${ids.length} proposta(s) atualizada(s)` });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Propostas {segment.toUpperCase()}</h1>
        </div>
        <div className="flex items-center gap-2">
          {totalPillCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="destructive" className="uppercase font-bold tracking-wide text-xs gap-0 px-0 overflow-hidden">
                  <span className="px-3">Alertas</span>
                  <span className="border-l border-white/40 px-2.5 self-stretch flex items-center">{totalPillCount}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <ScrollArea className="max-h-80">
                  {awaitingProspects.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 flex items-center gap-1.5">
                        <Plus className="h-3 w-3" /> Aguardando Orçamento
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">{awaitingProspects.length}</span>
                      </p>
                      {awaitingProspects.map((p) => (
                        <button
                          key={p.id}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors text-left"
                          onClick={() => {
                            setEditingId(null);
                            setInitialProspectId(p.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {feedbackGroups.changes.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 flex items-center gap-1.5">
                        <PenLine className="h-3 w-3" /> Solicitações de Ajustes
                      </p>
                      {feedbackGroups.changes.map((f) => {
                        const isExpanded = expandedFeedback === `change-${f.proposal_id}`;
                        return (
                          <div key={f.proposal_id}>
                            <button
                              className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors text-left"
                              onClick={() => setExpandedFeedback(isExpanded ? null : `change-${f.proposal_id}`)}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                                <span className="truncate">{f.proposal_title}</span>
                              </span>
                              <span className="shrink-0 ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold px-1">
                                {f.count}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-6 mr-2 mb-2 space-y-1.5">
                                {f.messages.map((m) => (
                                  <div key={m.id} className="rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground">
                                    <p>{m.content}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                                  </div>
                                ))}
                                <Button size="sm" variant="outline" className="w-full text-xs mt-1" onClick={() => { setEditingId(f.proposal_id); setInitialProspectId(null); setDialogOpen(true); }}>
                                  <Pencil className="h-3 w-3 mr-1" /> Abrir Proposta
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {feedbackGroups.questions.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3" /> Dúvidas
                      </p>
                      {feedbackGroups.questions.map((f) => {
                        const isExpanded = expandedFeedback === `question-${f.proposal_id}`;
                        return (
                          <div key={f.proposal_id}>
                            <button
                              className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors text-left"
                              onClick={() => setExpandedFeedback(isExpanded ? null : `question-${f.proposal_id}`)}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                                <span className="truncate">{f.proposal_title}</span>
                              </span>
                              <span className="shrink-0 ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold px-1">
                                {f.count}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-6 mr-2 mb-2 space-y-1.5">
                                {f.messages.map((m) => (
                                  <div key={m.id} className="rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground">
                                    <p>{m.content}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                                  </div>
                                ))}
                                <Button size="sm" variant="outline" className="w-full text-xs mt-1" onClick={() => { setEditingId(f.proposal_id); setInitialProspectId(null); setDialogOpen(true); }}>
                                  <Pencil className="h-3 w-3 mr-1" /> Abrir Proposta
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* ── Status Alerts ── */}
                  {totalAlertCount > 0 && (
                    <div className="p-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Alertas de Status</p>
                      {alertCounts.approvedNoDate > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Aprovadas sem data</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">{alertCounts.approvedNoDate}</span>
                        </div>
                      )}
                      {alertCounts.approvedNoContract > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Aprovadas sem contrato</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">{alertCounts.approvedNoContract}</span>
                        </div>
                      )}
                      {alertCounts.signedNoPayment > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Contrato assinado s/ pgto</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">{alertCounts.signedNoPayment}</span>
                        </div>
                      )}
                      {alertCounts.sentNoReturn > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Enviadas s/ retorno 7+ dias</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold px-1">{alertCounts.sentNoReturn}</span>
                        </div>
                      )}
                      {alertCounts.contractSentNotSigned > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Contrato enviado s/ assinatura</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold px-1">{alertCounts.contractSentNotSigned}</span>
                        </div>
                      )}
                      {alertCounts.partialPayment > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Pagamento parcial em aberto</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">{alertCounts.partialPayment}</span>
                        </div>
                      )}
                      {alertCounts.expired > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground">
                          <span>Expiradas</span>
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-gray-500 text-white text-[10px] font-bold px-1">{alertCounts.expired}</span>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
          <Button size="sm" onClick={() => { setEditingId(null); setInitialProspectId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Proposta
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proposta, código ou prospect..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(statusMap).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <HiddenColumnsButton
          columns={[
            { key: "code", label: "Código" },
            { key: "title", label: "Título" },
            { key: "prospect_name", label: "Prospect" },
            { key: "guide_name", label: "Guia" },
            { key: "status", label: "Status" },
            { key: "seller_name", label: "Vendedor" },
            { key: "total", label: "Total (R$)" },
            { key: "valid_until", label: "Validade" },
          ]}
          hiddenColumns={hiddenColumns}
          showColumn={showColumn}
          showAll={showAll}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <TooltipProvider delayDuration={200}>
        <div className="border border-border rounded-lg overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="bg-card sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))} onCheckedChange={() => selection.toggleAll(allIds)} />
                </th>
                {!isHidden("code") && <SmartTh label="Código" sortKey="code" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("code")} />}
                {!isHidden("title") && <SmartTh label="Título" sortKey="title" filterState={filterState} data={filtered} onHide={() => hideColumn("title")} />}
                {!isHidden("prospect_name") && <SmartTh label="Prospect" sortKey="prospect_name" filterState={filterState} data={filtered} className="hidden sm:table-cell" onHide={() => hideColumn("prospect_name")} />}
                {!isHidden("status") && <SmartTh label="Status" sortKey="status" filterState={filterState} data={proposals} labelMap={Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [k, v.label]))} onHide={() => hideColumn("status")} />}
                {!isHidden("guide_name") && <SmartTh label="Guia" sortKey="guide_name" filterState={filterState} data={filtered} className="hidden lg:table-cell" onHide={() => hideColumn("guide_name")} />}
                {!isHidden("seller_name") && <SmartTh label="Vendedor" sortKey="seller_name" filterState={filterState} data={filtered} className="hidden lg:table-cell" onHide={() => hideColumn("seller_name")} />}
                {!isHidden("total") && <SmartTh label="Total (R$)" sortKey="total" filterState={filterState} data={filtered} className="text-right" onHide={() => hideColumn("total")} />}
                {!isHidden("valid_until") && <SmartTh label="Validade" sortKey="valid_until" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("valid_until")} />}
                <th className="p-3 w-20 md:w-32" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = statusMap[p.status] || statusMap.draft;
                const proposalLink = getProposalLink(p);
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-border hover:bg-muted/30 cursor-pointer ${selection.isSelected(p.id) ? "bg-primary/5" : ""}`}
                    onClick={() => { setEditingId(p.id); setInitialProspectId(null); setDialogOpen(true); }}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selection.isSelected(p.id)} onCheckedChange={() => selection.toggle(p.id)} />
                    </td>
                    {!isHidden("code") && <td className="p-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{p.code || "—"}</td>}
                    {!isHidden("title") && <td className="p-3 font-medium max-w-[160px] truncate">{p.title}</td>}
                    {!isHidden("prospect_name") && <td className="p-3 text-muted-foreground hidden sm:table-cell">{p.prospect_name || "—"}</td>}
                    {!isHidden("status") && <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className={st.color}>{st.label}</Badge>
                          {feedbackCounts[p.id] && feedbackCounts[p.id] > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                              {feedbackCounts[p.id]}
                            </span>
                          )}
                        </div>
                        {p.contract_status && (() => {
                          const cs = contractStatusMap[p.contract_status];
                          return cs ? <Badge className={`${cs.color} text-[10px] px-1.5 py-0`}>{cs.label}</Badge> : null;
                        })()}
                        {p.payment_status && (() => {
                          const ps = paymentStatusMap[p.payment_status];
                          return ps ? <Badge className={`${ps.color} text-[10px] px-1.5 py-0`}>{ps.label}</Badge> : null;
                        })()}
                      </div>
                    </td>}
                    {!isHidden("guide_name") && <td className="p-3 text-muted-foreground hidden lg:table-cell">{(p as any).guide_name || "—"}</td>}
                    {!isHidden("seller_name") && <td className="p-3 text-muted-foreground hidden lg:table-cell">{p.seller_name || "—"}</td>}
                    {!isHidden("total") && <td className="p-3 text-right font-medium">{Number(p.total).toFixed(2)}</td>}
                    {!isHidden("valid_until") && <td className="p-3 text-muted-foreground hidden md:table-cell">
                      {p.valid_until ? new Date(p.valid_until).toLocaleDateString("pt-BR") : "—"}
                    </td>}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end flex-wrap">
                        {proposalLink && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="hidden sm:inline-flex" asChild>
                                  <a href={getProposalPath(p)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver proposta do cliente</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="hidden sm:inline-flex" onClick={() => {
                                  navigator.clipboard.writeText(proposalLink);
                                  setCopiedId(p.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}>
                                  {copiedId === p.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{copiedId === p.id ? "Copiado!" : "Copiar link"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span><WhatsAppButton proposal={p} prospectPhone={p.prospect_phone || null} prospectId={p.prospect_id} /></span>
                              </TooltipTrigger>
                              <TooltipContent>Enviar via WhatsApp</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingId(p.id); setInitialProspectId(null); setDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar orçamento</TooltipContent>
                        </Tooltip>
                        {(p.slug || p.share_token) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="hidden md:inline-flex" onClick={() => navigate(`${getProposalPath(p)}?edit=1`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar proposta visual</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Proposta?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a proposta <strong>{p.title}</strong> e todos os itens relacionados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate(p.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteMutation.isPending ? "Removendo..." : "Excluir"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TooltipTrigger>
                          <TooltipContent>Remover proposta</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhuma proposta encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </TooltipProvider>
      )}

      <BulkActionBar count={selection.count} onClear={selection.clear} onDelete={handleBulkDelete} onExport={handleBulkExport} onDuplicate={handleBulkDuplicate} bulkFields={BULK_FIELDS} onBulkUpdate={handleBulkUpdate} />

      <ProposalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposalId={editingId}
        segment={segment}
        initialProspectId={initialProspectId}
      />
    </div>
  );
}
