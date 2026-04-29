import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageSquare, Phone, Mail, ArrowRightLeft, Users, Clock, Plus, Send, FileText, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Interaction {
  id: string;
  type: string;
  content: string;
  created_at: string;
}

interface Stage { id: string; name: string; color: string; }

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string;
  segment: string;
  tags: string[];
  notes: string | null;
  next_followup_at: string | null;
  stage_id: string | null;
  created_at: string;
}

interface ProspectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  interactions: Interaction[];
  stages: Stage[];
  onAddInteraction: (prospectId: string, type: string, content: string) => void;
  onUpdateFollowup: (prospectId: string, date: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  stage_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  meeting: <Users className="h-3.5 w-3.5" />,
  reuniao_reagendada: <Calendar className="h-3.5 w-3.5" />,
  reuniao_cancelada: <Calendar className="h-3.5 w-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  note: "Nota",
  call: "Ligação",
  email: "Email",
  whatsapp: "WhatsApp",
  stage_change: "Mudança de etapa",
  meeting: "Reunião",
  reuniao_reagendada: "Reunião Reagendada",
  reuniao_cancelada: "Reunião Cancelada",
};

const SOURCE_LABELS: Record<string, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  manychat: "ManyChat",
  indicacao: "Indicação",
  email: "Email",
  manual: "Manual",
  import: "Importação",
};

export default function ProspectSheet({ open, onOpenChange, prospect, interactions, stages, onAddInteraction, onUpdateFollowup }: ProspectSheetProps) {
  const [newType, setNewType] = useState("note");
  const [newContent, setNewContent] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Linked proposal lookup
  const [linkedProposal, setLinkedProposal] = useState<{ id: string; code: string } | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  useEffect(() => {
    if (!prospect?.id) { setLinkedProposal(null); return; }
    setLoadingProposal(true);
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("proposals")
        .select("id, code")
        .eq("prospect_id", prospect.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLinkedProposal(data ? { id: data.id, code: data.code || "—" } : null);
      setLoadingProposal(false);
    })();
  }, [prospect?.id]);

  if (!prospect) return null;

  const stage = stages.find(s => s.id === prospect.stage_id);

  const handleSendInteraction = () => {
    if (!newContent.trim()) return;
    onAddInteraction(prospect.id, newType, newContent.trim());
    setNewContent("");
  };

  const handleFollowup = () => {
    if (!followupDate) return;
    onUpdateFollowup(prospect.id, followupDate);
    setFollowupDate("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl">{prospect.name}</SheetTitle>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stage && (
              <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
                {stage.name}
              </Badge>
            )}
            <Badge variant="secondary">{SOURCE_LABELS[prospect.source] ?? prospect.source}</Badge>
            {prospect.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </SheetHeader>

        {/* Proposal buttons */}
        <div className="mt-3 mb-1 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {loadingProposal ? "Verificando proposta..." : linkedProposal ? (
              <span>Proposta existente: <strong>{linkedProposal.code}</strong></span>
            ) : "Sem proposta criada."}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => {
                if (linkedProposal) {
                  const seg = prospect.segment || "b2c";
                  navigate(`/admin/${seg}/propostas?edit=${linkedProposal.id}`);
                  onOpenChange(false);
                } else {
                  toast({ title: "Cliente sem proposta criada", variant: "destructive" });
                }
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              Acessar Proposta
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={async () => {
                const seg = prospect.segment || "b2c";

                // Fetch questionnaire data for pre-fill
                let numPeople = 1;
                let startDateVal: string | null = null;
                let endDateVal: string | null = null;
                let numDaysVal = 1;
                let lang = "pt";

                if (seg === "b2c" && prospect.email) {
                  const { data: qr } = await (supabase as any)
                    .from("quote_requests")
                    .select("answers, language")
                    .eq("user_email", prospect.email)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (qr?.answers) {
                    const ans = typeof qr.answers === "object" ? qr.answers : {};
                    numPeople = parseInt(String(ans.groupSize)) || 1;
                    startDateVal = ans.startDate ? String(ans.startDate) : null;
                    endDateVal = ans.endDate ? String(ans.endDate) : null;
                    numDaysVal = parseInt(String(ans.numDays)) || 1;
                    lang = qr.language || "pt";
                  }
                } else if (seg === "b2b" && prospect.email) {
                  const { data: il } = await (supabase as any)
                    .from("imersao_leads")
                    .select("num_participantes, data_especifica, data_especifica_fim")
                    .eq("email", prospect.email)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (il) {
                    numPeople = parseInt(il.num_participantes) || 1;
                    startDateVal = il.data_especifica || null;
                    endDateVal = il.data_especifica_fim || null;
                  }
                }

                const { data: newProp } = await (supabase as any)
                  .from("proposals")
                  .insert({
                    title: `Proposta — ${prospect.name}`,
                    segment: seg,
                    prospect_id: prospect.id,
                    num_people: numPeople,
                    start_date: startDateVal,
                    end_date: endDateVal,
                    num_days: numDaysVal,
                    language: lang,
                    status: "draft",
                  })
                  .select("id")
                  .single();
                if (newProp) {
                  navigate(`/admin/${seg}/propostas?edit=${newProp.id}`);
                  onOpenChange(false);
                }
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Criar Proposta
            </Button>
          </div>
        </div>

        <div className="space-y-5 mt-5">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {prospect.email && (
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{prospect.email}</p>
              </div>
            )}
            {prospect.phone && (
              <div>
                <span className="text-muted-foreground">Telefone</span>
                <p className="font-medium">{prospect.phone}</p>
              </div>
            )}
            {prospect.company_name && (
              <div>
                <span className="text-muted-foreground">Empresa</span>
                <p className="font-medium">{prospect.company_name}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Criado em</span>
              <p className="font-medium">{format(new Date(prospect.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          {prospect.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notas</span>
              <p className="mt-0.5 whitespace-pre-wrap">{prospect.notes}</p>
            </div>
          )}

          {/* Follow-up */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Próximo follow-up
              </span>
              {prospect.next_followup_at && (
                <p className="text-sm font-medium">{format(new Date(prospect.next_followup_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
              <Input type="datetime-local" value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button size="sm" variant="outline" onClick={handleFollowup} disabled={!followupDate}>
              <Calendar className="h-3.5 w-3.5 mr-1" /> Agendar
            </Button>
          </div>

          {/* Add interaction */}
          <div className="space-y-2 border-t border-border pt-4">
            <span className="text-sm font-medium flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Nova interação
            </span>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["note", "call", "email", "whatsapp", "meeting"].map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={2} placeholder="Descreva a interação..." className="text-sm" />
            <Button size="sm" onClick={handleSendInteraction} disabled={!newContent.trim()}>
              <Send className="h-3.5 w-3.5 mr-1" /> Registrar
            </Button>
          </div>

          {/* Timeline */}
          <div className="border-t border-border pt-4 space-y-3">
            <span className="text-sm font-medium">Histórico</span>
            {interactions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma interação registrada.</p>}
            {interactions.map(i => (
              <div key={i.id} className="flex gap-2 text-sm">
                <div className="mt-0.5 text-muted-foreground">{TYPE_ICONS[i.type] ?? <MessageSquare className="h-3.5 w-3.5" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{TYPE_LABELS[i.type] ?? i.type}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(i.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{i.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
