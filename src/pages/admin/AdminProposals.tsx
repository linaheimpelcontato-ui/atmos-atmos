import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 min-w-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <FileText className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Propostas {segment.toUpperCase()}</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Gestão de orçamentos e propostas comerciais</p>
        </div>

        <div className="flex items-center gap-3 ml-14 sm:ml-0">
          {totalPillCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="destructive" className="h-10 rounded-xl uppercase font-black tracking-widest text-[10px] gap-0 px-0 overflow-hidden shadow-xl shadow-destructive/30 transition-all hover:scale-105 active:scale-95 border-none bg-gradient-to-r from-destructive to-red-500 group">
                  <span className="px-4">Alertas</span>
                  <span className="bg-white/20 backdrop-blur-md px-3 self-stretch flex items-center border-l border-white/20 font-extrabold">{totalPillCount}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 rounded-[2rem] border-admin-border/60 shadow-2xl overflow-hidden" align="end">
                <div className="bg-admin-primary/5 p-6 border-b border-admin-border/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-admin-primary">Central de Atenção</p>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2 space-y-1">
                    {awaitingProspects.length > 0 && (
                      <div className="p-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-2 flex items-center gap-2">
                          <Plus className="h-3 w-3" /> Aguardando Orçamento
                        </p>
                        {awaitingProspects.map((p) => (
                          <button
                            key={p.id}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-admin-primary/5 text-sm transition-all text-left group"
                            onClick={() => {
                              setEditingId(null);
                              setInitialProspectId(p.id);
                              setDialogOpen(true);
                            }}
                          >
                            <div className="h-8 w-8 rounded-xl bg-admin-primary/10 flex items-center justify-center group-hover:bg-admin-primary group-hover:text-white transition-colors">
                              <Plus className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-admin-primary truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {(feedbackGroups.changes.length > 0 || feedbackGroups.questions.length > 0) && (
                      <div className="p-2 border-t border-admin-border/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-2 flex items-center gap-2">
                          <MessageCircle className="h-3 w-3" /> Feedback do Cliente
                        </p>
                        
                        {feedbackGroups.changes.map((f) => (
                          <div key={f.proposal_id} className="mb-1">
                            <button
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-2xl hover:bg-orange-500/5 text-sm transition-all text-left group"
                              onClick={() => setExpandedFeedback(expandedFeedback === `change-${f.proposal_id}` ? null : `change-${f.proposal_id}`)}
                            >
                              <span className="font-bold text-orange-600 truncate flex items-center gap-2">
                                <PenLine className="h-3.5 w-3.5" />
                                {f.proposal_title}
                              </span>
                              <Badge className="bg-orange-500/90 backdrop-blur-sm text-white border-none text-[10px] h-5 min-w-[20px] rounded-full shadow-md shadow-orange-500/20 transition-transform hover:scale-110">{f.count}</Badge>
                            </button>
                            {expandedFeedback === `change-${f.proposal_id}` && (
                              <div className="mx-2 mb-2 p-3 space-y-2 bg-orange-500/[0.03] border border-orange-500/10 rounded-2xl">
                                {f.messages.map((m) => (
                                  <div key={m.id} className="text-[11px] leading-relaxed text-orange-900/80">
                                    <p className="font-medium italic">"{m.content}"</p>
                                    <p className="text-[9px] opacity-50 mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                                  </div>
                                )) }
                                <Button size="sm" variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest h-8 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all" onClick={() => { setEditingId(f.proposal_id); setInitialProspectId(null); setDialogOpen(true); }}>
                                  Resolver Ajustes
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}

                        {feedbackGroups.questions.map((f) => (
                          <div key={f.proposal_id} className="mb-1">
                            <button
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-2xl hover:bg-blue-500/5 text-sm transition-all text-left group"
                              onClick={() => setExpandedFeedback(expandedFeedback === `question-${f.proposal_id}` ? null : `question-${f.proposal_id}`)}
                            >
                              <span className="font-bold text-blue-600 truncate flex items-center gap-2">
                                <HelpCircle className="h-3.5 w-3.5" />
                                {f.proposal_title}
                              </span>
                              <Badge className="bg-blue-500/90 backdrop-blur-sm text-white border-none text-[10px] h-5 min-w-[20px] rounded-full shadow-md shadow-blue-500/20 transition-transform hover:scale-110">{f.count}</Badge>
                            </button>
                            {expandedFeedback === `question-${f.proposal_id}` && (
                              <div className="mx-2 mb-2 p-3 space-y-2 bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl">
                                {f.messages.map((m) => (
                                  <div key={m.id} className="text-[11px] leading-relaxed text-blue-900/80">
                                    <p className="font-medium italic">"{m.content}"</p>
                                    <p className="text-[9px] opacity-50 mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                                  </div>
                                ))}
                                <Button size="sm" variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest h-8 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all" onClick={() => { setEditingId(f.proposal_id); setInitialProspectId(null); setDialogOpen(true); }}>
                                  Responder Dúvida
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {totalAlertCount > 0 && (
                      <div className="p-2 border-t border-admin-border/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-2">Alertas Operacionais</p>
                        <div className="space-y-1">
                          {alertCounts.approvedNoDate > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-600 bg-amber-500/5 rounded-xl">
                              <span>Aprovadas sem data</span>
                              <Badge className="bg-amber-500 border-none h-5 min-w-[20px] rounded-full">{alertCounts.approvedNoDate}</Badge>
                            </div>
                          )}
                          {alertCounts.expired > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-red-600 bg-red-500/5 rounded-xl">
                              <span>Propostas expiradas</span>
                              <Badge className="bg-red-500 border-none h-5 min-w-[20px] rounded-full">{alertCounts.expired}</Badge>
                            </div>
                          )}
                          {alertCounts.signedNoPayment > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-destructive bg-destructive/5 rounded-xl">
                              <span>Assinadas sem pagamento</span>
                              <Badge className="bg-destructive border-none h-5 min-w-[20px] rounded-full">{alertCounts.signedNoPayment}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
          
          <Button 
            onClick={() => { setEditingId(null); setInitialProspectId(null); setDialogOpen(true); }}
            className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] px-8 shadow-xl shadow-admin-primary/20 transition-all hover:scale-105 active:scale-95 bg-admin-primary hover:bg-admin-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Proposta
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/60 backdrop-blur-md p-3 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input 
            placeholder="Buscar por código, título ou prospect..." 
            className="pl-12 h-12 bg-transparent border-none focus-visible:ring-0 text-base font-semibold placeholder:text-muted-foreground/40" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 pr-2">
          <div className="flex items-center bg-admin-muted/40 rounded-[1.25rem] p-1.5 gap-1.5">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[160px] font-black text-[10px] uppercase tracking-widest">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos Status</SelectItem>
                {Object.entries(statusMap).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-[10px] font-black uppercase tracking-widest">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-admin-border/40 mx-1" />

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
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground font-medium animate-pulse">Carregando propostas...</p>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden transition-all duration-500">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-admin-border/40">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-admin-muted/80 backdrop-blur-md border-b border-admin-border/40">
                    <th className="p-6 w-12 text-center">
                      <Checkbox 
                        checked={allIds.length > 0 && allIds.every(id => selection.isSelected(id))} 
                        onCheckedChange={() => selection.toggleAll(allIds)} 
                        className="rounded-md border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                      />
                    </th>
                    {!isHidden("code") && (
                      <SmartTh 
                        label="Cód" 
                        sortKey="code" 
                        filterState={filterState} 
                        data={filtered} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60 hidden md:table-cell" 
                        onHide={() => hideColumn("code")} 
                      />
                    )}
                    {!isHidden("title") && (
                      <SmartTh 
                        label="Título" 
                        sortKey="title" 
                        filterState={filterState} 
                        data={filtered} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60" 
                        onHide={() => hideColumn("title")} 
                      />
                    )}
                    {!isHidden("prospect_name") && (
                      <SmartTh 
                        label="Prospect" 
                        sortKey="prospect_name" 
                        filterState={filterState} 
                        data={filtered} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60 hidden sm:table-cell" 
                        onHide={() => hideColumn("prospect_name")} 
                      />
                    )}
                    {!isHidden("status") && (
                      <SmartTh 
                        label="Status" 
                        sortKey="status" 
                        filterState={filterState} 
                        data={proposals} 
                        labelMap={Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [k, v.label]))} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60" 
                        onHide={() => hideColumn("status")} 
                      />
                    )}
                    {!isHidden("total") && (
                      <SmartTh 
                        label="Total" 
                        sortKey="total" 
                        filterState={filterState} 
                        data={filtered} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60 text-right" 
                        onHide={() => hideColumn("total")} 
                      />
                    )}
                    {!isHidden("valid_until") && (
                      <SmartTh 
                        label="Validade" 
                        sortKey="valid_until" 
                        filterState={filterState} 
                        data={filtered} 
                        className="p-4 font-black text-[10px] uppercase tracking-widest text-admin-primary/60 hidden md:table-cell" 
                        onHide={() => hideColumn("valid_until")} 
                      />
                    )}
                        <th className="p-6 w-20 md:w-32" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border/20">
                  {filtered.map((p) => {
                    const st = statusMap[p.status] || statusMap.draft;
                    const proposalLink = getProposalLink(p);
                    const isSelected = selection.isSelected(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={`group transition-all duration-200 cursor-pointer ${isSelected ? "bg-admin-primary/[0.04]" : "hover:bg-admin-muted/30"}`}
                        onClick={() => { setEditingId(p.id); setInitialProspectId(null); setDialogOpen(true); }}
                      >
                        <td className="p-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => selection.toggle(p.id)} 
                            className="rounded-md border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                          />
                        </td>
                        {!isHidden("code") && (
                          <td className="p-6 font-mono text-[10px] font-black tracking-widest text-admin-primary/30 hidden md:table-cell">
                            {p.code || "—"}
                          </td>
                        )}
                        {!isHidden("title") && (
                          <td className="p-6">
                            <p className="font-black text-admin-primary text-sm leading-tight group-hover:translate-x-1 transition-transform tracking-tight">{p.title}</p>
                            {p.seller_name && <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40 mt-1">Resp: {p.seller_name}</p>}
                          </td>
                        )}
                        {!isHidden("prospect_name") && (
                          <td className="p-6 hidden sm:table-cell">
                            <p className="text-xs font-black text-admin-primary/80 uppercase tracking-wide">{p.prospect_name || "—"}</p>
                            {p.prospect_phone && <p className="text-[10px] font-medium text-muted-foreground/40 mt-0.5 tracking-tight">{p.prospect_phone}</p>}
                          </td>
                        )}
                        {!isHidden("status") && (
                          <td className="p-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border-none shadow-sm ${st.color}`}>
                                  {st.label}
                                </Badge>
                                {feedbackCounts[p.id] && feedbackCounts[p.id] > 0 && (
                                  <Badge className="bg-red-500 text-white border-none text-[9px] font-black h-5 min-w-[20px] px-1 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                                    {feedbackCounts[p.id]}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {p.contract_status && contractStatusMap[p.contract_status] && (
                                  <Badge className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border-none opacity-80 ${contractStatusMap[p.contract_status].color}`}>
                                    {contractStatusMap[p.contract_status].label}
                                  </Badge>
                                )}
                                {p.payment_status && paymentStatusMap[p.payment_status] && (
                                  <Badge className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border-none opacity-80 ${paymentStatusMap[p.payment_status].color}`}>
                                    {paymentStatusMap[p.payment_status].label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        {!isHidden("total") && (
                          <td className="p-6 text-right">
                            <p className="font-black text-admin-primary text-sm tracking-tight">
                              {Number(p.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                          </td>
                        )}
                        {!isHidden("valid_until") && (
                          <td className="p-6 text-muted-foreground/60 text-xs hidden md:table-cell font-black uppercase tracking-widest">
                            {p.valid_until ? new Date(p.valid_until).toLocaleDateString("pt-BR") : "—"}
                          </td>
                        )}
                        <td className="p-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {proposalLink && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-admin-primary/10" asChild>
                                      <a href={getProposalPath(p)} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5 text-admin-primary" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver proposta</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-admin-primary/10" onClick={() => {
                                      navigator.clipboard.writeText(proposalLink);
                                      setCopiedId(p.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}>
                                      {copiedId === p.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-admin-primary" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{copiedId === p.id ? "Copiado!" : "Copiar link"}</TooltipContent>
                                </Tooltip>
                                <WhatsAppButton proposal={p} prospectPhone={p.prospect_phone || null} prospectId={p.prospect_id} />
                              </>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-admin-primary/10" onClick={() => { setEditingId(p.id); setInitialProspectId(null); setDialogOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5 text-admin-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar orçamento</TooltipContent>
                            </Tooltip>
                            
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Excluir proposta</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent className="rounded-[2rem] border-admin-border/60">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl font-black text-admin-primary">Confirmar Exclusão?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm font-medium">
                                    Esta ação é permanente e removerá a proposta <span className="font-bold text-admin-primary">{p.title}</span> do sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl border-admin-border/60 font-bold">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate(p.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold"
                                  >
                                    Excluir Definitivamente
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-admin-muted/40">
                            <Search className="h-8 w-8 text-admin-primary/20" />
                          </div>
                          <p className="text-muted-foreground font-bold tracking-tight">Nenhuma proposta encontrada com os filtros atuais.</p>
                          <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-admin-primary" onClick={() => { setSearch(""); setFilterStatus("all"); filterState.clearAll(); }}>Limpar Filtros</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TooltipProvider>
      )}

      <BulkActionBar 
        count={selection.count} 
        onClear={selection.clear} 
        onDelete={handleBulkDelete} 
        onExport={handleBulkExport} 
        onDuplicate={handleBulkDuplicate} 
        bulkFields={BULK_FIELDS} 
        onBulkUpdate={handleBulkUpdate} 
      />

      <ProposalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposalId={editingId}
        segment={segment}
        initialProspectId={initialProspectId}
      />
    </motion.div>
  );
}
