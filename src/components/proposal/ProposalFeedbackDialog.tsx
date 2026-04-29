import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Send, HelpCircle, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

type FeedbackItem = { type: "question" | "change_request"; content: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  lang?: string;
}

const i18n: Record<string, Record<string, string>> = {
  pt: {
    title: "Solicitar Ajustes",
    subtitle: "Use esta área para enviar suas dúvidas ou solicitar ajustes no roteiro. Nossa equipe receberá suas mensagens e retornará o mais breve possível.",
    tabQuestions: "Dúvidas",
    tabChanges: "Alterações",
    addQuestion: "Adicionar dúvida",
    addChange: "Adicionar solicitação",
    placeholder_q: "Escreva sua dúvida aqui...",
    placeholder_c: "Descreva a alteração desejada...",
    send: "Enviar Ajustes",
    sending: "Enviando...",
    success: "Enviado com sucesso! Nossa equipe retornará em breve.",
    empty: "Adicione pelo menos uma dúvida ou solicitação.",
    emptyContent: "Preencha todos os campos antes de enviar.",
  },
  en: {
    title: "Request Adjustments",
    subtitle: "Use this area to send your questions or request changes to the itinerary. Our team will receive your messages and respond as soon as possible.",
    tabQuestions: "Questions",
    tabChanges: "Changes",
    addQuestion: "Add question",
    addChange: "Add request",
    placeholder_q: "Write your question here...",
    placeholder_c: "Describe the desired change...",
    send: "Send Adjustments",
    sending: "Sending...",
    success: "Sent successfully! Our team will respond shortly.",
    empty: "Add at least one question or request.",
    emptyContent: "Fill all fields before sending.",
  },
  es: {
    title: "Solicitar Ajustes",
    subtitle: "Use esta área para enviar sus dudas o solicitar ajustes en el itinerario. Nuestro equipo recibirá sus mensajes y responderá lo antes posible.",
    tabQuestions: "Dudas",
    tabChanges: "Cambios",
    addQuestion: "Agregar duda",
    addChange: "Agregar solicitud",
    placeholder_q: "Escriba su duda aquí...",
    placeholder_c: "Describa el cambio deseado...",
    send: "Enviar Ajustes",
    sending: "Enviando...",
    success: "¡Enviado con éxito! Nuestro equipo responderá pronto.",
    empty: "Agregue al menos una duda o solicitud.",
    emptyContent: "Complete todos los campos antes de enviar.",
  },
};

export default function ProposalFeedbackDialog({ open, onOpenChange, proposalId, lang = "pt" }: Props) {
  const t = i18n[lang] || i18n.pt;
  const { toast } = useToast();
  const [questions, setQuestions] = useState<string[]>([""]);
  const [changes, setChanges] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);

  const addItem = (list: string[], setter: (v: string[]) => void) => setter([...list, ""]);
  const removeItem = (list: string[], setter: (v: string[]) => void, idx: number) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== idx));
  };
  const updateItem = (list: string[], setter: (v: string[]) => void, idx: number, val: string) => {
    const copy = [...list];
    copy[idx] = val;
    setter(copy);
  };

  const handleSend = async () => {
    const allItems: FeedbackItem[] = [
      ...questions.filter(q => q.trim()).map(q => ({ type: "question" as const, content: q.trim() })),
      ...changes.filter(c => c.trim()).map(c => ({ type: "change_request" as const, content: c.trim() })),
    ];
    if (allItems.length === 0) {
      toast({ title: t.empty, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const payload = allItems.map(item => ({
        proposal_id: proposalId,
        type: item.type,
        content: item.content,
      }));
      const { error } = await db.from("proposal_feedback").insert(payload);
      if (error) throw error;
      toast({ title: t.success, className: "border-white/20 text-white [&>div]:text-white", style: { background: "rgba(0,0,0,0.08)", backdropFilter: "blur(20px)" } } as any);
      setQuestions([""]);
      setChanges([""]);
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: "#fcfaf7", border: "1px solid #e4dbcc" }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold" style={{ color: "#2e2019" }}>{t.title}</DialogTitle>
          <p className="text-sm mt-1" style={{ color: "#8d7b63" }}>{t.subtitle}</p>
        </DialogHeader>

        <Tabs defaultValue="questions" className="mt-4">
          <TabsList className="w-full" style={{ background: "#f0ebe3" }}>
            <TabsTrigger value="questions" className="flex-1 gap-1.5 data-[state=active]:bg-white">
              <HelpCircle className="w-4 h-4" />
              {t.tabQuestions}
            </TabsTrigger>
            <TabsTrigger value="changes" className="flex-1 gap-1.5 data-[state=active]:bg-white">
              <PenLine className="w-4 h-4" />
              {t.tabChanges}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-3 mt-3">
            {questions.map((q, idx) => (
              <div key={idx} className="flex gap-2">
                <Textarea
                  value={q}
                  onChange={e => updateItem(questions, setQuestions, idx, e.target.value)}
                  placeholder={t.placeholder_q}
                  className="flex-1 min-h-[60px] resize-none text-sm"
                  style={{ background: "#fff", borderColor: "#e4dbcc" }}
                />
                {questions.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeItem(questions, setQuestions, idx)} className="shrink-0 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(questions, setQuestions)} className="w-full" style={{ borderColor: "#d4c9b8", color: "#556952" }}>
              <Plus className="w-4 h-4 mr-1" />
              {t.addQuestion}
            </Button>
          </TabsContent>

          <TabsContent value="changes" className="space-y-3 mt-3">
            {changes.map((c, idx) => (
              <div key={idx} className="flex gap-2">
                <Textarea
                  value={c}
                  onChange={e => updateItem(changes, setChanges, idx, e.target.value)}
                  placeholder={t.placeholder_c}
                  className="flex-1 min-h-[60px] resize-none text-sm"
                  style={{ background: "#fff", borderColor: "#e4dbcc" }}
                />
                {changes.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeItem(changes, setChanges, idx)} className="shrink-0 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(changes, setChanges)} className="w-full" style={{ borderColor: "#d4c9b8", color: "#556952" }}>
              <Plus className="w-4 h-4 mr-1" />
              {t.addChange}
            </Button>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full mt-4 font-medium"
          style={{ background: "#556952", color: "#fff" }}
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? t.sending : t.send}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
