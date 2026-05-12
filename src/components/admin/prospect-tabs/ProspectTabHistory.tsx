import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Mail, ArrowRightLeft, Users, Send, Plus, Linkedin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_OPTIONS = [
  { value: "note", label: "Nota", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { value: "call", label: "Ligação", icon: <Phone className="h-3.5 w-3.5" /> },
  { value: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { value: "meeting", label: "Reunião", icon: <Users className="h-3.5 w-3.5" /> },
  { value: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-3.5 w-3.5" /> },
  { value: "reuniao_reagendada", label: "Reunião Reagendada", icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  { value: "reuniao_cancelada", label: "Reunião Cancelada", icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
];

const TYPE_ICONS: Record<string, React.ReactNode> = Object.fromEntries(TYPE_OPTIONS.map(t => [t.value, t.icon]));
const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map(t => [t.value, t.label]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProspectTabHistory({ interactions, onAdd }: { interactions: any[]; onAdd: (type: string, content: string) => void }) {
  const [newType, setNewType] = useState("note");
  const [newContent, setNewContent] = useState("");

  const handleSend = () => {
    if (!newContent.trim()) return;
    onAdd(newType, newContent.trim());
    setNewContent("");
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
      {/* Add interaction */}
      <div className="space-y-6 border border-admin-border/40 rounded-[2.5rem] p-8 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-admin-primary/5 rounded-xl">
              <Plus className="h-5 w-5 text-admin-primary" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary block leading-none">Registrar Interação</span>
              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Atividade do Relacionamento</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-44 h-11 rounded-xl border-admin-border/60 bg-white text-[11px] font-black uppercase tracking-widest text-admin-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border/60">
                {TYPE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-[10px] font-black uppercase tracking-widest py-3">
                    <div className="flex items-center gap-2">
                      {t.icon}
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSend} disabled={!newContent.trim()} className="h-11 rounded-xl px-8 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-admin-primary/10 transition-all hover:scale-[1.02]">
              <Send className="h-3.5 w-3.5 mr-2" /> Salvar
            </Button>
          </div>
        </div>

        <Textarea 
          value={newContent} 
          onChange={e => setNewContent(e.target.value)} 
          rows={3} 
          placeholder="Descreva detalhadamente o que aconteceu nesta interação..." 
          className="rounded-2xl border-admin-border/60 text-sm p-5 focus-visible:ring-admin-primary/20 bg-white resize-none font-medium leading-relaxed" 
        />
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Linha do Tempo / Atividades</h3>
          <div className="h-[1px] flex-1 bg-admin-border/20 mx-6" />
        </div>

        {interactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-[3rem] border border-dashed border-admin-border/40 bg-white shadow-sm">
            <div className="p-6 bg-admin-primary/5 rounded-full mb-4">
              <MessageSquare className="h-10 w-10 text-admin-primary/20" />
            </div>
            <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Nenhuma interação documentada</p>
          </div>
        )}

        <div className="relative space-y-4">
          {/* Vertical line connector */}
          {interactions.length > 1 && (
            <div className="absolute left-[34px] top-8 bottom-8 w-[1px] bg-gradient-to-b from-admin-border/40 via-admin-border/20 to-transparent pointer-events-none" />
          )}

          {interactions.map((i, idx) => (
            <div key={i.id} className="relative flex gap-6 p-6 rounded-[2rem] border border-admin-border/30 bg-white hover:border-admin-primary/20 transition-all group shadow-sm hover:shadow-md">
              <div className="relative z-10 p-3 rounded-2xl bg-white border border-admin-border/40 text-admin-primary shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                {TYPE_ICONS[i.type] ?? <MessageSquare className="h-5 w-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-admin-primary uppercase tracking-[0.2em]">{TYPE_LABELS[i.type] ?? i.type}</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-admin-primary/20" />
                    <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
                      {format(new Date(i.created_at), "dd MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">{i.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
