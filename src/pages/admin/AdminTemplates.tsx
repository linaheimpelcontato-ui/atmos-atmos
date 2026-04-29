import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, Edit, Mail, MessageCircle, Instagram, Linkedin } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: Mail, color: "bg-blue-100 text-blue-800" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-green-100 text-green-800" },
  { value: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-100 text-pink-800" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-sky-100 text-sky-800" },
];

export default function AdminTemplates() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", segment: "b2c", language: "pt", channel: "email", subject: "", body: "" });
  const [filterChannel, setFilterChannel] = useState<string>("all");

  const fetchTemplates = useCallback(async () => {
    const { data } = await db.from("email_templates").select("*").order("created_at", { ascending: false });
    setTemplates(data ?? []);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openNew = () => {
    setEditingId(null);
    setForm({ title: "", segment: "b2c", language: "pt", channel: "email", subject: "", body: "" });
    setDialogOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ title: t.title, segment: t.segment, language: t.language, channel: t.channel || "email", subject: t.subject, body: t.body });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.subject.trim()) return;
    if (editingId) {
      await db.from("email_templates").update(form).eq("id", editingId);
    } else {
      await db.from("email_templates").insert(form);
    }
    setDialogOpen(false);
    fetchTemplates();
    toast({ title: editingId ? "Template atualizado" : "Template criado" });
  };

  const handleDelete = async (id: string) => {
    await db.from("email_templates").delete().eq("id", id);
    fetchTemplates();
  };

  const handleCopy = (body: string) => {
    navigator.clipboard.writeText(body);
    toast({ title: "Copiado para a área de transferência!" });
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filtered = filterChannel === "all" ? templates : templates.filter(t => t.channel === filterChannel);
  const channelMeta = (ch: string) => CHANNEL_OPTIONS.find(c => c.value === ch) || CHANNEL_OPTIONS[0];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Templates de Abordagem</h1>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {/* Channel filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterChannel("all")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterChannel === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
        >
          Todos ({templates.length})
        </button>
        {CHANNEL_OPTIONS.map(ch => {
          const count = templates.filter(t => t.channel === ch.value).length;
          const Icon = ch.icon;
          return (
            <button
              key={ch.value}
              onClick={() => setFilterChannel(ch.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1 ${filterChannel === ch.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
            >
              <Icon className="h-3 w-3" /> {ch.label} ({count})
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        Use variáveis como <code className="bg-muted px-1 rounded">{"{{nome_contato}}"}</code>, <code className="bg-muted px-1 rounded">{"{{nome_empresa}}"}</code>, <code className="bg-muted px-1 rounded">{"{{tipo_empresa}}"}</code> nos templates.
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => {
            const meta = channelMeta(t.channel);
            const Icon = meta.icon;
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{t.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Badge className={`text-[10px] ${meta.color}`}>
                        <Icon className="h-2.5 w-2.5 mr-0.5" /> {meta.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{t.segment.toUpperCase()}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{t.language.toUpperCase()}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-3">{t.body}</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleCopy(t.body)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o template <strong>{t.title}</strong>? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(t.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={v => set("channel", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select value={form.segment} onValueChange={v => set("segment", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2c">B2C</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Idioma</Label>
                <Select value={form.language} onValueChange={v => set("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input value={form.subject} onChange={e => set("subject", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Corpo da mensagem</Label>
              <Textarea value={form.body} onChange={e => set("body", e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
