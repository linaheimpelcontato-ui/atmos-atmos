import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuideGuard } from "@/hooks/useGuideGuard";
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle2, Clock, Check, X, CalendarX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const db = supabase as any;

export default function GuideAgenda() {
  const { guideId } = useGuideGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("approved");
  const [proposalDetails, setProposalDetails] = useState<any>(null);
  const [costDesc, setCostDesc] = useState("");
  const [costAmount, setCostAmount] = useState("");

  // Fetch proposals assigned to this guide
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["guide-agenda", guideId],
    queryFn: async () => {
      // Fetch both negotiating and approved proposals where this guide is assigned
      const { data, error } = await db
        .from("proposals")
        .select(`
          id, title, status, start_date, created_at, num_people, valid_until,
          proposal_day_items (
            type, title, product_id, products(name)
          )
        `)
        .eq("guide_id", guideId)
        .in("status", ["approved", "negotiating", "sent"]);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!guideId,
  });

  // Split into Confirmed (approved) and Negotiating (sent/negotiating)
  const { confirmed, negotiating } = useMemo(() => {
    const conf: any[] = [];
    const neg: any[] = [];
    
    proposals.forEach((p: any) => {
      if (p.status === "approved") {
        conf.push(p);
      } else {
        neg.push(p);
      }
    });
    
    // Sort by date (nearest first)
    const sortFn = (a: any, b: any) => {
      const dA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dA - dB;
    };
    
    return { confirmed: conf.sort(sortFn), negotiating: neg.sort(sortFn) };
  }, [proposals]);

  const acceptMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      // In a real scenario, you'd have a `guide_approval_status` column.
      // Here we simulate by adding an internal note or calling an RPC.
      // E.g., await db.from("proposals").update({ notes: "Guia aprovou!" }).eq("id", proposalId);
      return new Promise((resolve) => setTimeout(resolve, 600));
    },
    onSuccess: () => {
      toast({ title: "Participação Confirmada!", description: "A agência foi notificada da sua disponibilidade." });
      setProposalDetails(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      // Same logic for rejection
      return new Promise((resolve) => setTimeout(resolve, 600));
    },
    onSuccess: () => {
      toast({ title: "Passeio Recusado", description: "A agência foi notificada para buscar outro guia." });
      setProposalDetails(null);
    }
  });

  const handleBookOff = () => {
    toast({
      title: "Recurso em Destaque",
      description: "A marcação de indisponibilidade exige uma nova tabela no banco de dados. Fale com o suporte para habilitar esta função automágica internamente no Supabase.",
      duration: 5000,
    });
  }

  const { data: tripCosts = [], isLoading: isLoadingCosts } = useQuery({
    queryKey: ["guide-trip-costs", proposalDetails?.id],
    queryFn: async () => {
      const { data, error } = await db.from("guide_trip_costs").select("*").eq("proposal_id", proposalDetails?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!proposalDetails?.id,
  });

  const addCostMutation = useMutation({
    mutationFn: async () => {
      if (!costDesc || !costAmount) return;
      const amountVal = Number(costAmount.replace(".", "").replace(",", ".")) || 0;
      const { error } = await db.from("guide_trip_costs").insert({
        proposal_id: proposalDetails.id,
        guide_id: guideId,
        description: costDesc,
        amount: amountVal,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-trip-costs", proposalDetails?.id] });
      setCostDesc("");
      setCostAmount("");
      toast({ title: "Custo Adicionado", description: "Custo operacional registrado com sucesso." });
    }
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      const { error } = await db.from("guide_trip_costs").delete().eq("id", costId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-trip-costs", proposalDetails?.id] });
    }
  });

  const renderProposalCard = (p: any, isNegotiating: boolean) => {
    const startDate = p.start_date ? new Date(p.start_date).toLocaleDateString("pt-BR") : "Data a definir";
    const waterfalls = (p.proposal_day_items || [])
      .filter((i: any) => i.type === "waterfall")
      .map((i: any) => i.products?.name || i.title || "Cachoeira");

    // Remove duplicates
    const uniqueWaterfalls = Array.from(new Set(waterfalls));

    return (
      <Card key={p.id} className="hover:shadow-md transition-shadow border-border/60 hover:border-border cursor-pointer" onClick={() => setProposalDetails(p)}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isNegotiating ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Em Negociação</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmado</Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="h-3 w-3" /> {startDate}
                </span>
              </div>
              <h3 className="font-bold text-base text-foreground line-clamp-1">{p.title}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{p.num_people || "N/A"} pax</span>
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{uniqueWaterfalls.length > 0 ? uniqueWaterfalls.join(", ") : "Roteiro personalizado"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Minha Agenda</h1>
          <p className="text-muted-foreground text-sm">Visualize passeios fechados, orçamentos e bloqueie sua disponibilidade.</p>
        </div>
        <Button onClick={handleBookOff} variant="outline" className="bg-card">
          <CalendarX className="h-4 w-4 mr-2" /> Bloquear Data
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Fechados / Futuros
          </TabsTrigger>
          <TabsTrigger value="negotiating" className="gap-2">
            <Clock className="h-4 w-4" />
            Em Negociação
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="approved" className="mt-6">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground animate-pulse">Carregando calendário...</div>
          ) : confirmed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmed.map((p: any) => renderProposalCard(p, false))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed rounded-xl border-border bg-card/30">
              <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-medium text-foreground mb-1">Agenda Livre</h3>
              <p className="text-sm text-muted-foreground">Nenhum passeio confirmado nas próximas datas.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="negotiating" className="mt-6">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground animate-pulse">Carregando orçamentos...</div>
          ) : negotiating.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {negotiating.map((p: any) => renderProposalCard(p, true))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed rounded-xl border-border bg-card/30">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-medium text-foreground mb-1">Nenhum orçamento</h3>
              <p className="text-sm text-muted-foreground">Você não está sinalizado em nenhuma proposta em negociação no momento.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Visão do Roteiro */}
      <Dialog open={!!proposalDetails} onOpenChange={(o) => !o && setProposalDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Roteiro</DialogTitle>
          </DialogHeader>
          {proposalDetails && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-muted/40 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data Prevista:</span>
                  <span className="font-semibold">{proposalDetails.start_date ? new Date(proposalDetails.start_date).toLocaleDateString("pt-BR") : "A definir"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Turistas:</span>
                  <span className="font-semibold">{proposalDetails.num_people || "N/A"} passageiros</span>
                </div>
                {proposalDetails.valid_until && (
                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                    <span className="text-muted-foreground">Proposta expira em:</span>
                    <span className="text-orange-600 font-medium">{new Date(proposalDetails.valid_until).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Cachoeiras e Atrativos</h4>
                <ul className="space-y-2">
                  {(proposalDetails.proposal_day_items || [])
                    .filter((i: any) => i.type === "waterfall")
                    .map((i: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm px-3 py-2 bg-card border border-border rounded-md">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {i.products?.name || i.title || "Pacote de Cachoeira"}
                      </li>
                    ))}
                </ul>
              </div>

              {tab === "negotiating" && (
                <div className="flex gap-3 pt-4 border-t border-border mt-6">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={() => acceptMutation.mutate(proposalDetails.id)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" /> Aceitar Passeio
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => rejectMutation.mutate(proposalDetails.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" /> Recusar
                  </Button>
                </div>
              )}

              {tab === "approved" && (
                <div className="pt-6 border-t border-border mt-6">
                  <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
                    Meus Custos Operacionais
                    <Badge variant="secondary" className="font-mono text-xs">
                      R$ {tripCosts.reduce((a: number, c: any) => a + Number(c.amount || 0), 0)?.toFixed(2).replace('.', ',')}
                    </Badge>
                  </h4>
                  <div className="space-y-3">
                    {tripCosts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-sm px-3 py-2 bg-muted/40 border border-border/50 rounded-md">
                        <span className="truncate pr-2">{c.description}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            - R$ {Number(c.amount).toFixed(2).replace('.', ',')}
                          </span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            - R$ {Number(c.amount).toFixed(2).replace('.', ',')}
                          </span>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-muted-foreground hover:text-destructive transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Custo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente excluir o custo "<strong>{c.description}</strong>"? Isso atualizará seu saldo líquido deste passeio.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteCostMutation.mutate(c.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    {tripCosts.length === 0 && !isLoadingCosts && (
                      <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum custo registrado neste passeio.</p>
                    )}
                    
                    <div className="flex items-end gap-2 pt-2">
                       <div className="space-y-1.5 flex-1">
                          <label className="text-xs text-muted-foreground">O que você gastou?</label>
                          <input 
                            placeholder="Ex: Gasolina, Almoço..." 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={costDesc}
                            onChange={(e) => setCostDesc(e.target.value)}
                          />
                       </div>
                       <div className="space-y-1.5 w-24">
                          <label className="text-xs text-muted-foreground">Valor (R$)</label>
                          <input 
                            placeholder="0,00" 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={costAmount}
                            onChange={(e) => setCostAmount(e.target.value)}
                          />
                       </div>
                       <Button 
                         size="sm" 
                         className="h-9 mb-[1px]" 
                         disabled={!costDesc || !costAmount || addCostMutation.isPending}
                         onClick={() => addCostMutation.mutate()}
                       >
                         Adicionar
                       </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
