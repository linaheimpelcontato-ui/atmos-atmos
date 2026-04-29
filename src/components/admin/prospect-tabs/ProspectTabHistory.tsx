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
    <div className="space-y-5">
      {/* Add interaction */}
      <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
        <span className="text-sm font-medium flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Nova interação
        </span>
        <div className="flex gap-2">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSend} disabled={!newContent.trim()} className="shrink-0">
            <Send className="h-3.5 w-3.5 mr-1" /> Registrar
          </Button>
        </div>
        <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={2} placeholder="Descreva a interação..." className="text-sm" />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {interactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma interação registrada.</p>}
        {interactions.map(i => (
          <div key={i.id} className="flex gap-3 text-sm border-b border-border pb-3 last:border-0">
            <div className="mt-0.5 text-muted-foreground shrink-0">
              {TYPE_ICONS[i.type] ?? <MessageSquare className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-xs">{TYPE_LABELS[i.type] ?? i.type}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(i.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{i.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
