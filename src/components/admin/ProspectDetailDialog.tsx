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
import { User, Users, Brain, History, FileText, Globe, ShoppingBag, Star, RotateCcw, Trash2 } from "lucide-react";
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{prospect.name}</DialogTitle>
            {stage && (
              <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
                {stage.name}
              </Badge>
            )}
            <Badge variant={isRecurrent ? "default" : "secondary"} className="gap-1">
              {isRecurrent && <Star className="h-3 w-3 fill-current" />}
              {recurrenceLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isB2B && prospect.company_type && <span>{prospect.company_type}</span>}
            {isB2B && prospect.country && <><span>·</span><span>{prospect.country}</span></>}
            {isB2B && prospect.website && (
              <>
                <span>·</span>
                <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Site
                </a>
              </>
            )}
            {!isB2B && prospect.company_name && <span>{prospect.company_name}</span>}
          </div>
        </DialogHeader>

        {/* Purchase History Card */}
        {purchaseHistory.length > 0 && (
          <div className="mx-6 mt-2 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Histórico de Compras</span>
              {isRecurrent && (
                <Badge variant="default" className="gap-1 ml-auto text-xs">
                  <RotateCcw className="h-3 w-3" /> Cliente Recorrente
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 rounded bg-background border border-border">
                <div className="text-lg font-bold text-primary">{tripCount}</div>
                <div className="text-[11px] text-muted-foreground">{tripCount === 1 ? "Proposta Aceita" : "Propostas Aceitas"}</div>
              </div>
              <div className="text-center p-2 rounded bg-background border border-border">
                <div className="text-lg font-bold text-primary">R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
                <div className="text-[11px] text-muted-foreground">Total Acumulado</div>
              </div>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {purchaseHistory.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={p.status === "accepted" ? "default" : "outline"} className="text-[10px] shrink-0">
                      {p.status === "accepted" ? "Aceita" : p.status === "sent" ? "Enviada" : p.status === "draft" ? "Rascunho" : p.status}
                    </Badge>
                    <span className="truncate">{p.title}</span>
                    {(p.from_phone_match || p.from_doc_match) && <span className="text-muted-foreground italic">(via {p.matched_name})</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                    {p.start_date && <span>{format(new Date(p.start_date), "dd/MM/yy")}</span>}
                    <span className="font-medium text-foreground">R$ {(p.total ?? 0).toLocaleString("pt-BR")}</span>
                    {p.status === "draft" && !p.from_phone_match && !p.from_doc_match && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A proposta "{p.title}" será excluída permanentemente junto com todos os itens relacionados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProposal(p.id)}>Excluir</AlertDialogAction>
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

        <Tabs value={tab} onValueChange={setTab} className="px-6 pb-6">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="general" className="gap-1.5"><User className="h-3.5 w-3.5" />Geral</TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" />Contatos</TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-1.5"><Brain className="h-3.5 w-3.5" />{isB2B ? "Inteligência" : "IA"}</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <ProspectTabGeneral prospect={prospect} stages={stages} segment={segment} onUpdate={handleUpdateProspect} />
          </TabsContent>
          <TabsContent value="contacts">
            <ProspectTabContacts contacts={contacts} onAdd={handleAddContact} onDelete={handleDeleteContact} />
          </TabsContent>
          <TabsContent value="intelligence">
            <ProspectTabIntelligence prospect={prospect} onUpdate={handleUpdateProspect} segment={segment} />
          </TabsContent>
          <TabsContent value="history">
            <ProspectTabHistory interactions={interactions} onAdd={handleAddInteraction} />
          </TabsContent>
          <TabsContent value="documents">
            <ProspectTabDocuments prospectId={prospect.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
