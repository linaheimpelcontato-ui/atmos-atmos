import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Plus, Trash2, Mail, Linkedin } from "lucide-react";
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
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefone" },
  { value: "linkedin", label: "LinkedIn" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProspectTabContacts({ contacts, onAdd, onDelete }: { contacts: any[]; onAdd: (c: Record<string, unknown>) => void; onDelete: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", linkedin: "", best_channel: "email", notes: "" });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.name.trim()) return;
    onAdd({ ...form, notes: form.notes || null });
    setForm({ name: "", role: "", email: "", phone: "", linkedin: "", best_channel: "email", notes: "" });
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contatos ({contacts.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {adding && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input className="h-8 text-sm" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cargo</Label>
              <Input className="h-8 text-sm" value={form.role} onChange={e => set("role", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-sm" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <PhoneInput value={form.phone} onChange={v => set("phone", v)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">LinkedIn</Label>
              <Input className="h-8 text-sm" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Canal preferido</Label>
              <Select value={form.best_channel} onValueChange={v => set("best_channel", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!form.name.trim()}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum contato vinculado.</p>
      )}

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.name}</span>
                {c.role && <span className="text-xs text-muted-foreground">• {c.role}</span>}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                {c.phone && <WhatsAppPhone phone={c.phone} className="text-xs" />}
                {c.linkedin && <span className="flex items-center gap-1"><Linkedin className="h-3 w-3" />{c.linkedin}</span>}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive shrink-0 h-7 w-7">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover Contato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover o contato <strong>{c.name}</strong>? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(c.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
