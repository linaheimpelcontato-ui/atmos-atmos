import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ProspectTabGeneral from "./prospect-tabs/ProspectTabGeneral";
import ProspectTabContacts from "./prospect-tabs/ProspectTabContacts";
import ProspectTabHistory from "./prospect-tabs/ProspectTabHistory";
import ProspectTabIntelligence from "./prospect-tabs/ProspectTabIntelligence";
import ProspectTabDocuments from "./prospect-tabs/ProspectTabDocuments";
import { User, Users, Brain, History, FileText, Globe, ShoppingBag, Star, RotateCcw, Trash2, Building2 } from "lucide-react";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Stage { id: string; name: string; color: string; }

interface ProspectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string | null;
  stages: Stage[];
  segment: "b2c" | "b2b";
  onUpdated: () => void;
}

export default function ProspectDetailDialog({ open, onOpenChange, prospectId, stages, segment, onUpdated }: ProspectDetailDialogProps) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prospect, setProspect] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [interactions, setInteractions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, setContacts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [tab, setTab] = useState("general");

  const fetchProspect = useCallback(async () => {
    if (!prospectId) return;
    const { data } = await db.from("prospects").select("*").eq("id", prospectId).single();
    setProspect(data);
  }, [prospectId]);

  const fetchInteractions = useCallback(async () => {
    if (!prospectId) return;
    const { data } = await db.from("prospect_interactions").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false });
    setInteractions(data ?? []);
  }, [prospectId]);

  const fetchContacts = useCallback(async () => {
    if (!prospectId) return;
    const { data } = await db.from("contacts").select("*").eq("prospect_id", prospectId).order("created_at");
    setContacts(data ?? []);
  }, [prospectId]);

  const fetchPurchaseHistory = useCallback(async () => {
    if (!prospectId) return;
    // Get proposals directly linked to this prospect
    const { data: directProposals } = await db.from("proposals").select("id, title, total, status, start_date, created_at, num_people, num_days").eq("prospect_id", prospectId).order("created_at", { ascending: false });

    // Also find proposals from other prospects with same phone or document
    let matchedProposals: any[] = [];
    const matchedIds = new Set<string>();

    // Match by phone
    if (prospect?.phone) {
      const { data: samePhoneProspects } = await db.from("prospects").select("id, name").eq("phone", prospect.phone).neq("id", prospectId);
      if (samePhoneProspects?.length) {
        samePhoneProspects.forEach((s: any) => matchedIds.add(s.id));
        const ids = samePhoneProspects.map((p: any) => p.id);
        const { data } = await db.from("proposals").select("id, title, total, status, start_date, created_at, num_people, num_days, prospect_id").in("prospect_id", ids).order("created_at", { ascending: false });
        matchedProposals.push(...(data ?? []).map((p: any) => ({ ...p, from_phone_match: true, matched_name: samePhoneProspects.find((s: any) => s.id === p.prospect_id)?.name })));
      }
    }

    // Match by document (CPF/CNPJ)
    if (prospect?.document) {
      const { data: sameDocProspects } = await db.from("prospects").select("id, name").eq("document", prospect.document).neq("id", prospectId);
      if (sameDocProspects?.length) {
        const newIds = sameDocProspects.filter((s: any) => !matchedIds.has(s.id));
        if (newIds.length) {
          const ids = newIds.map((p: any) => p.id);
          const { data } = await db.from("proposals").select("id, title, total, status, start_date, created_at, num_people, num_days, prospect_id").in("prospect_id", ids).order("created_at", { ascending: false });
          matchedProposals.push(...(data ?? []).map((p: any) => ({ ...p, from_doc_match: true, matched_name: sameDocProspects.find((s: any) => s.id === p.prospect_id)?.name })));
        }
      }
    }

    const all = [...(directProposals ?? []), ...matchedProposals];
    setPurchaseHistory(all);
  }, [prospectId, prospect?.phone, prospect?.document]);

  useEffect(() => {
    if (open && prospectId) {
      setTab("general");
      fetchProspect();
      fetchInteractions();
      fetchContacts();
    }
  }, [open, prospectId, fetchProspect, fetchInteractions, fetchContacts]);

  useEffect(() => {
    if (prospect) fetchPurchaseHistory();
  }, [prospect, fetchPurchaseHistory]);

  const handleUpdateProspect = async (patch: Record<string, unknown>) => {
    if (!prospectId) return;
    const { error } = await db.from("prospects").update(patch).eq("id", prospectId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prospect atualizado" });
      fetchProspect();
      onUpdated();
    }
  };

  const handleAddInteraction = async (type: string, content: string) => {
    if (!prospectId) return;
    await db.from("prospect_interactions").insert({
      prospect_id: prospectId,
      type,
      content,
      created_by: user?.id,
    });
    fetchInteractions();
    await db.from("prospects").update({ last_interaction: new Date().toISOString() }).eq("id", prospectId);
  };

  const handleAddContact = async (contact: Record<string, unknown>) => {
    if (!prospectId) return;
    const { error } = await db.from("contacts").insert({ ...contact, prospect_id: prospectId });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchContacts();
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const { error } = await db.from("contacts").delete().eq("id", contactId);
    if (!error) fetchContacts();
  };

  const handleDeleteProposal = async (proposalId: string) => {
    // Delete related items first, then the proposal
    await Promise.all([
      db.from("proposal_day_items").delete().eq("proposal_id", proposalId),
      db.from("proposal_days").delete().eq("proposal_id", proposalId),
      db.from("proposal_items").delete().eq("proposal_id", proposalId),
      db.from("proposal_costs").delete().eq("proposal_id", proposalId),
      db.from("proposal_cost_checks").delete().eq("proposal_id", proposalId),
      db.from("itinerary_checklist").delete().eq("proposal_id", proposalId),
    ]);
    const { error } = await db.from("proposals").delete().eq("id", proposalId);
    if (error) {
      toast({ title: "Erro ao excluir proposta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proposta excluída" });
      fetchPurchaseHistory();
      onUpdated();
    }
  };

  if (!prospect) return null;

  const stage = stages.find(s => s.id === prospect.stage_id);
  const isB2B = segment === "b2b";

  const acceptedProposals = purchaseHistory.filter((p: any) => p.status === "accepted");
  const tripCount = acceptedProposals.length;
  const totalSpent = acceptedProposals.reduce((sum: number, p: any) => sum + (p.total ?? 0), 0);
  const recurrenceLabel = tripCount === 0 ? "Novo Lead" : tripCount === 1 ? "1º Roteiro" : `${tripCount}º Roteiro`;
  const isRecurrent = tripCount > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white rounded-[2.5rem]">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white border-b border-admin-border/40 px-8 pt-10 pb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 border-none ${prospect.segment === "b2b" ? "bg-indigo-500/10 text-indigo-600" : "bg-rose-500/10 text-rose-600"}`}>
                    {prospect.segment === "b2b" ? "B2B" : "B2C"}
                  </Badge>
                  {stage && (
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-white border-admin-border/60 shadow-sm" style={{ color: stage.color }}>
                      {stage.name}
                    </Badge>
                  )}
                  <Badge variant={isRecurrent ? "default" : "secondary"} className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 gap-1.5 shadow-sm">
                    {isRecurrent && <Star className="h-3 w-3 fill-current" />}
                    {recurrenceLabel}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <DialogTitle className="text-4xl font-black tracking-tight text-admin-primary leading-tight">
                    {prospect.name}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                    {isB2B && prospect.company_type && <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{prospect.company_type}</span>}
                    {(prospect.city || prospect.country) && (
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        {[prospect.city, prospect.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {prospect.website && (
                      <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-admin-primary hover:text-admin-primary/70 transition-colors flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                    {!isB2B && prospect.company_name && <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{prospect.company_name}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Purchase History Card */}
            {purchaseHistory.length > 0 && (
              <div className="mx-8 mt-6 p-8 rounded-[2.5rem] border border-admin-border/30 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-admin-primary/5 rounded-2xl">
                    <ShoppingBag className="h-5 w-5 text-admin-primary" />
                  </div>
                  <span className="font-black text-xs uppercase tracking-[0.2em] text-admin-primary">Histórico de Consumo</span>
                  {isRecurrent && (
                    <Badge variant="default" className="gap-2 ml-auto text-[10px] font-black uppercase tracking-widest h-9 px-4 bg-admin-primary shadow-lg shadow-admin-primary/20">
                      <RotateCcw className="h-3.5 w-3.5" /> Cliente Recorrente
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="p-6 rounded-2xl bg-white border border-admin-border/40 shadow-sm transition-all hover:border-admin-primary/20">
                    <div className="text-3xl font-black text-admin-primary tracking-tight">{tripCount}</div>
                    <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-2">{tripCount === 1 ? "Reserva" : "Reservas Realizadas"}</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white border border-admin-border/40 shadow-sm transition-all hover:border-admin-primary/20">
                    <div className="text-3xl font-black text-admin-primary tracking-tight">R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
                    <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1">LTV Estimado</div>
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                  {purchaseHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-admin-border/30 bg-white hover:border-admin-border/60 transition-all hover:shadow-sm group">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant={p.status === "accepted" ? "default" : "outline"} className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none ${p.status === "accepted" ? "bg-emerald-500 text-white" : "bg-admin-muted text-muted-foreground"}`}>
                          {p.status === "accepted" ? "Aceita" : p.status === "sent" ? "Enviada" : p.status === "draft" ? "Rascunho" : p.status}
                        </Badge>
                        <span className="text-xs font-bold text-admin-primary truncate">{p.title}</span>
                        {(p.from_phone_match || p.from_doc_match) && <span className="text-[10px] text-muted-foreground font-medium italic">via {p.matched_name}</span>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-admin-primary">R$ {(p.total ?? 0).toLocaleString("pt-BR")}</span>
                          {p.start_date && <span className="text-[10px] text-muted-foreground font-bold">{format(new Date(p.start_date), "dd/MM/yy")}</span>}
                        </div>
                        {p.status === "draft" && !p.from_phone_match && !p.from_doc_match && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-lg" onClick={e => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-black text-admin-primary">Excluir proposta?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                  A proposta "{p.title}" será removida permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProposal(p.id)} className="rounded-xl font-bold bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab} className="px-8 pb-8 pt-6">
              <TabsList className="bg-white border border-admin-border p-1 rounded-2xl h-12 w-full justify-start mb-8 overflow-x-auto no-scrollbar">
                <TabsTrigger value="general" className="gap-2 px-6 rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest"><User className="h-3.5 w-3.5" />Geral</TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2 px-6 rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest"><Users className="h-3.5 w-3.5" />Contatos</TabsTrigger>
                <TabsTrigger value="intelligence" className="gap-2 px-6 rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest"><Brain className="h-3.5 w-3.5" />Inteligência</TabsTrigger>
                <TabsTrigger value="history" className="gap-2 px-6 rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
                <TabsTrigger value="documents" className="gap-2 px-6 rounded-xl data-[state=active]:bg-admin-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest"><FileText className="h-3.5 w-3.5" />Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="bg-white">
                <ProspectTabGeneral prospect={prospect} stages={stages} segment={segment} onUpdate={handleUpdateProspect} />
              </TabsContent>
              <TabsContent value="contacts" className="bg-white">
                <ProspectTabContacts contacts={contacts} onAdd={handleAddContact} onDelete={handleDeleteContact} />
              </TabsContent>
              <TabsContent value="intelligence" className="bg-white">
                <ProspectTabIntelligence prospect={prospect} onUpdate={handleUpdateProspect} segment={segment} />
              </TabsContent>
              <TabsContent value="history" className="bg-white">
                <ProspectTabHistory interactions={interactions} onAdd={handleAddInteraction} />
              </TabsContent>
              <TabsContent value="documents" className="bg-white">
                <ProspectTabDocuments prospectId={prospect.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="p-8 bg-white border-t border-admin-border/40 flex items-center justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 h-12 text-muted-foreground hover:text-admin-primary font-bold uppercase tracking-widest text-xs">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
