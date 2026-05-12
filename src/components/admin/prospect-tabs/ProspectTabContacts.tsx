import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Plus, Trash2, Mail, Linkedin, Users } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary leading-none">Stakeholders & Contatos</h3>
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Rede de Relacionamento ({contacts.length})</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="h-11 rounded-xl px-8 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-admin-primary/10 transition-all hover:scale-[1.02] border-admin-border/60">
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border border-admin-border/40 rounded-[2.5rem] p-10 space-y-8 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Nome Completo *</Label>
                <Input className="h-12 rounded-xl border-admin-border/60 bg-white font-medium px-4" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Cargo / Função</Label>
                <Input className="h-12 rounded-xl border-admin-border/60 bg-white font-medium px-4" value={form.role} onChange={e => set("role", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Endereço de Email</Label>
                <Input className="h-12 rounded-xl border-admin-border/60 bg-white font-medium px-4" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Telefone / WhatsApp</Label>
                <PhoneInput value={form.phone} onChange={v => set("phone", v)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Perfil LinkedIn</Label>
                <Input className="h-12 rounded-xl border-admin-border/60 bg-white font-medium px-4" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Canal de Comunicação Preferido</Label>
                <Select value={form.best_channel} onValueChange={v => set("best_channel", v)}>
                  <SelectTrigger className="h-12 rounded-xl border-admin-border/60 bg-white font-medium px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-admin-border/60">
                    {CHANNELS.map(c => <SelectItem key={c.value} value={c.value} className="text-[10px] font-black uppercase tracking-widest py-3">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button onClick={handleAdd} disabled={!form.name.trim()} className="h-12 rounded-xl px-10 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-admin-primary/10">Confirmar Cadastro</Button>
              <Button variant="ghost" onClick={() => setAdding(false)} className="h-12 rounded-xl px-10 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground/40 hover:text-admin-primary">Descartar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {contacts.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-20 rounded-[3rem] border border-dashed border-admin-border/40 bg-white shadow-sm">
          <div className="p-6 bg-admin-primary/5 rounded-full mb-4">
            <Plus className="h-10 w-10 text-admin-primary/20" />
          </div>
          <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Nenhum contato cadastrado</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contacts.map((c) => (
          <div key={c.id} className="group relative border border-admin-border/30 rounded-[2rem] p-8 bg-white hover:border-admin-primary/20 transition-all shadow-sm hover:shadow-md overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Users className="w-16 h-16 text-admin-primary" />
            </div>

            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-black text-admin-primary leading-none">{c.name}</h4>
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-2">{c.role || "Cargo não informado"}</p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-destructive/20 hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem] border-admin-border/40 p-8">
                    <AlertDialogHeader className="space-y-4">
                      <AlertDialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Excluir Contato</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Deseja realmente remover o contato de {c.name}? Esta ação não pode ser desfeita no sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                      <AlertDialogCancel className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 border-admin-border/60">Manter</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(c.id)} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 bg-red-500 hover:bg-red-600 border-none">
                        Confirmar Exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="space-y-4 pt-2">
                {c.email && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-admin-primary/5 rounded-lg">
                      <Mail className="h-3.5 w-3.5 text-admin-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-3">
                    <WhatsAppPhone phone={c.phone} />
                  </div>
                )}
                {c.linkedin && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-admin-primary/5 rounded-lg">
                      <Linkedin className="h-3.5 w-3.5 text-admin-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground truncate">{c.linkedin}</span>
                  </div>
                )}
              </div>

              {c.best_channel && (
                <div className="pt-4 border-t border-admin-border/20">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 block mb-2">Canal Preferido</span>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-admin-primary/5 border border-admin-primary/10">
                    <span className="text-[9px] font-black text-admin-primary uppercase tracking-widest">{c.best_channel}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
