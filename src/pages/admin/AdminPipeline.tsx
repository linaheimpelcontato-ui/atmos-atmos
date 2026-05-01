import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import KanbanBoard from "@/components/admin/KanbanBoard";
import ProspectSheet from "@/components/admin/ProspectSheet";
import ProposalFormDialog from "@/components/admin/ProposalFormDialog";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search, X, Globe, UserCheck, Gauge, Tags } from "lucide-react";
import PopoverFilter from "@/components/shared/PopoverFilter";

import { motion, AnimatePresence } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface AdminPipelineProps {
  segment: "b2c" | "b2b";
}

export default function AdminPipeline({ segment }: AdminPipelineProps) {
  const { user } = useAuth();
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalEditingId, setProposalEditingId] = useState<string | null>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});

  /* ── filters ── */
  const [search, setSearch] = useState("");
  const [filterSources, setFilterSources] = useState<string[]>([]);
  const [filterSellers, setFilterSellers] = useState<string[]>([]);
  const [filterPotentials, setFilterPotentials] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const fetchStages = useCallback(async () => {
    const { data } = await db.from("pipeline_stages").select("*").eq("segment", segment).order("position");
    setStages(data ?? []);
  }, [segment]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("prospects").select("*, sellers(name)").eq("segment", segment);
    const mapped = (data ?? []).map((p: any) => ({ ...p, seller_name: p.sellers?.name ?? null }));
    setProspects(mapped);
    setLoading(false);
  }, [segment]);

  const fetchInteractions = useCallback(async (prospectId: string) => {
    const { data } = await db.from("prospect_interactions").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false });
    setInteractions(data ?? []);
  }, []);

  const [prospectProposalMap, setProspectProposalMap] = useState<Record<string, string>>({});

  const fetchFeedbackCounts = useCallback(async () => {
    const { data } = await db.from("proposal_feedback").select("proposal_id, proposals!inner(prospect_id)").eq("is_resolved", false);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((f: any) => {
      const pid = f.proposals?.prospect_id;
      if (pid) counts[pid] = (counts[pid] || 0) + 1;
    });
    setFeedbackCounts(counts);

    // Build prospect -> proposal map from feedback data
    const pMap: Record<string, string> = {};
    (data ?? []).forEach((f: any) => {
      const pid = f.proposals?.prospect_id;
      if (pid && !pMap[pid]) pMap[pid] = f.proposal_id;
    });
    setProspectProposalMap(pMap);
  }, []);

  useEffect(() => { fetchStages(); fetchProspects(); fetchFeedbackCounts(); }, [fetchStages, fetchProspects, fetchFeedbackCounts]);
  useEffect(() => {
    if (selectedProspect) fetchInteractions(selectedProspect.id);
  }, [selectedProspect, fetchInteractions]);

  /* ── derived filter options ── */
  const sourceOptions = useMemo(() =>
    [...new Set(prospects.map(p => p.source).filter(Boolean))].sort().map(s => ({ value: s, label: s })),
    [prospects]
  );
  const sellerOptions = useMemo(() =>
    [...new Set(prospects.map(p => p.seller_name).filter(Boolean))].sort().map(s => ({ value: s, label: s })),
    [prospects]
  );
  const potentialOptions = useMemo(() => [
    { value: "high", label: "Alto" },
    { value: "medium", label: "Médio" },
    { value: "low", label: "Baixo" },
  ], []);
  const tagOptions = useMemo(() =>
    [...new Set(prospects.flatMap(p => p.tags || []).filter(Boolean))].sort().map(t => ({ value: t, label: t })),
    [prospects]
  );

  /* ── filtered prospects ── */
  const filteredProspects = useMemo(() => {
    let list = prospects;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.company_name || "").toLowerCase().includes(q)
      );
    }
    if (filterSources.length > 0) list = list.filter(p => filterSources.includes(p.source));
    if (filterSellers.length > 0) list = list.filter(p => filterSellers.includes(p.seller_name));
    if (filterPotentials.length > 0) list = list.filter(p => filterPotentials.includes(p.potential));
    if (filterTags.length > 0) list = list.filter(p => (p.tags || []).some((t: string) => filterTags.includes(t)));
    return list;
  }, [prospects, search, filterSources, filterSellers, filterPotentials, filterTags]);

  const hasActiveFilters = search.trim() || filterSources.length > 0 || filterSellers.length > 0 || filterPotentials.length > 0 || filterTags.length > 0;

  const clearFilters = () => {
    setSearch("");
    setFilterSources([]);
    setFilterSellers([]);
    setFilterPotentials([]);
    setFilterTags([]);
  };

  const handleMoveProspect = async (prospectId: string, newStageId: string) => {
    const oldStage = stages.find(s => s.id === prospects.find(p => p.id === prospectId)?.stage_id);
    const newStage = stages.find(s => s.id === newStageId);

    // Block move to "Proposta Enviada" if no published proposal exists
    if (newStage?.name?.toLowerCase().includes("proposta enviada")) {
      const { count } = await db.from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("prospect_id", prospectId)
        .not("published_at", "is", null);
      if (!count || count === 0) {
        toast({ title: "Ação bloqueada", description: "Publique pelo menos uma proposta antes de mover para 'Proposta Enviada'." });
        return;
      }
    }

    // Optimistic update
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, stage_id: newStageId } : p));

    const { error } = await db.from("prospects").update({ stage_id: newStageId }).eq("id", prospectId);
    if (error) {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
      fetchProspects();
      return;
    }

    // Log stage change interaction
    await db.from("prospect_interactions").insert({
      prospect_id: prospectId,
      type: "stage_change",
      content: `${oldStage?.name ?? "?"} → ${newStage?.name ?? "?"}`,
      created_by: user?.id,
    });
  };

  const handleAddInteraction = async (prospectId: string, type: string, content: string) => {
    await db.from("prospect_interactions").insert({
      prospect_id: prospectId,
      type,
      content,
      created_by: user?.id,
    });
    fetchInteractions(prospectId);
  };

  const handleUpdateFollowup = async (prospectId: string, date: string) => {
    await db.from("prospects").update({ next_followup_at: date }).eq("id", prospectId);
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, next_followup_at: date } : p));
    if (selectedProspect?.id === prospectId) {
      setSelectedProspect((p: any) => p ? { ...p, next_followup_at: date } : p);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 min-w-0 flex flex-col h-full"
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-admin-primary">
          Pipeline {segment === "b2c" ? "B2C" : "B2B"}
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Gestão visual do funil de vendas e conversão</p>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="relative flex-1 w-full lg:max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-base font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pr-2">
          <PopoverFilter
            label="Origem"
            icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
            options={sourceOptions}
            selectedValues={filterSources}
            onChange={setFilterSources}
            multiSelect
          />

          {sellerOptions.length > 0 && (
            <PopoverFilter
              label="Vendedor"
              icon={<UserCheck className="h-3.5 w-3.5 text-muted-foreground" />}
              options={sellerOptions}
              selectedValues={filterSellers}
              onChange={setFilterSellers}
              multiSelect
            />
          )}

          <PopoverFilter
            label="Potencial"
            icon={<Gauge className="h-3.5 w-3.5 text-muted-foreground" />}
            options={potentialOptions}
            selectedValues={filterPotentials}
            onChange={setFilterPotentials}
            multiSelect
          />

          {tagOptions.length > 0 && (
            <PopoverFilter
              label="Tags"
              icon={<Tags className="h-3.5 w-3.5 text-muted-foreground" />}
              options={tagOptions}
              selectedValues={filterTags}
              onChange={setFilterTags}
              multiSelect
            />
          )}

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="h-10 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/5"
            >
              <X className="h-3.5 w-3.5 mr-2" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <RotateCcw className="h-8 w-8 text-admin-primary/20 animate-spin mb-4" />
          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Carregando pipeline...</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto pb-4">
          <KanbanBoard
            stages={stages}
            prospects={filteredProspects}
            onMoveProspect={handleMoveProspect}
            onCardClick={setSelectedProspect}
            feedbackCounts={feedbackCounts}
            onFeedbackClick={(prospectId: string) => {
              const propId = prospectProposalMap[prospectId] || null;
              setProposalEditingId(propId);
              setProposalDialogOpen(true);
            }}
          />
        </div>
      )}

      <ProspectSheet
        open={!!selectedProspect}
        onOpenChange={open => { if (!open) setSelectedProspect(null); }}
        prospect={selectedProspect}
        interactions={interactions}
        stages={stages}
        onAddInteraction={handleAddInteraction}
        onUpdateFollowup={handleUpdateFollowup}
      />

      <ProposalFormDialog
        open={proposalDialogOpen}
        onOpenChange={setProposalDialogOpen}
        proposalId={proposalEditingId}
        segment={segment}
      />
    </motion.div>
  );
}
