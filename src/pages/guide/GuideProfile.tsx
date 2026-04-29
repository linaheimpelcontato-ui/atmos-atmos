import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuideGuard } from "@/hooks/useGuideGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserCheck } from "lucide-react";

const db = supabase as any;

const RESIDENCE_OPTIONS = ["Alto Paraíso", "São Jorge", "Cavalcante", "Colinas", "São João D'Aliança", "Moinho", "Engenho II"];
const LANGUAGE_OPTIONS = ["Português", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano"];
const GENDER_OPTIONS: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Outro" };

export default function GuideProfile() {
  const { guideId } = useGuideGuard();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "", phone: "", residence: "", gender: "", age: "" as string | number, instagram: "",
    has_4x4: false, vehicle_seats: 5, limit_tourist: "" as string | number,
    languages: [] as string[], specialties: "", is_kalunga: false, has_cadastur: false, notes: ""
  });

  const { data: guide, isLoading } = useQuery({
    queryKey: ["guide-profile-edit", guideId],
    queryFn: async () => {
      const { data } = await db.from("guides").select("*").eq("id", guideId).single();
      return data;
    },
    enabled: !!guideId,
  });

  useEffect(() => {
    if (guide) {
      setForm({
        name: guide.name || "", phone: guide.phone || "", residence: guide.residence || "", gender: guide.gender || "",
        age: guide.age || "", instagram: guide.instagram || "", has_4x4: guide.has_4x4 || false,
        vehicle_seats: guide.vehicle_seats || 5, limit_tourist: guide.limit_tourist || "",
        languages: guide.languages || [], specialties: (guide.specialties || []).join(", "),
        is_kalunga: guide.is_kalunga || false, has_cadastur: guide.has_cadastur || false, notes: guide.notes || ""
      });
    }
  }, [guide]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, phone: form.phone || null, residence: form.residence || null, gender: form.gender || null,
        age: typeof form.age === "number" ? form.age : (parseInt(String(form.age)) || null),
        instagram: form.instagram || null, has_4x4: form.has_4x4, vehicle_seats: form.vehicle_seats,
        limit_4x4: form.has_4x4 ? (form.vehicle_seats - 1) : null,
        limit_tourist: typeof form.limit_tourist === "number" ? form.limit_tourist : (parseInt(String(form.limit_tourist)) || null),
        languages: form.languages, specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        is_kalunga: form.is_kalunga, has_cadastur: form.has_cadastur, notes: form.notes || null,
      };
      const { error } = await db.from("guides").update(payload).eq("id", guideId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide-profile-edit", guideId] });
      toast({ title: "Perfil Atualizado com sucesso!" });
    }
  });

  const toggleLanguage = (lang: string) => {
    setForm((f) => ({
      ...f, languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando perfil...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
         <UserCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm">Mantenha seus veículos e especialidades atualizados para as novas propostas.</p>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>Nome Completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Residência</Label>
              <Select value={form.residence} onValueChange={(v) => setForm({ ...form, residence: v })}>
                <SelectTrigger><SelectValue placeholder="Onde você mora hoje?" /></SelectTrigger>
                <SelectContent>
                  {RESIDENCE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_OPTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Idade</Label>
              <Input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Instagram Profissional</Label>
              <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@guia.chapadadosveadeiros" />
            </div>
            <div className="space-y-2">
              <Label>Limite de Turistas no Passeio</Label>
              <Input type="number" min="0" placeholder="Ex: 6 (padrão)" value={form.limit_tourist} onChange={(e) => setForm({ ...form, limit_tourist: e.target.value })} />
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg space-y-4">
             <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.has_4x4} onCheckedChange={(v) => setForm({ ...form, has_4x4: v, vehicle_seats: v ? form.vehicle_seats : 5 })} /> Possui 4x4 Próprio
                </label>
                {form.has_4x4 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground mr-1">Tamanho do Carro:</span>
                    <Select value={String(form.vehicle_seats)} onValueChange={(v) => setForm({ ...form, vehicle_seats: parseInt(v) })}>
                      <SelectTrigger className="h-9 w-32 border-input bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 lugares</SelectItem>
                        <SelectItem value="7">7 lugares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
             </div>
             {form.has_4x4 && (
               <p className="text-xs text-muted-foreground">O limite de pax no seu carro 4x4 será calculado automaticamente como <strong className="text-foreground">{form.vehicle_seats - 1} vagas</strong> (tirando o seu assento de motorista).</p>
             )}
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-base">Especialidades e Idiomas</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Especialidades (separe por vírgula)</Label>
              <Input placeholder="Rapel, Trilhas longas, Travessia..." value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            </div>
            
            <div className="pt-2">
               <Label className="text-xs text-muted-foreground mb-2 block">Idiomas Flutuantes</Label>
               <div className="flex flex-wrap gap-4">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <label key={lang} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <Checkbox checked={form.languages.includes(lang)} onCheckedChange={() => toggleLanguage(lang)} />
                    {lang}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-border/40">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={form.is_kalunga} onCheckedChange={(v) => setForm({ ...form, is_kalunga: v })} /> Guia Kalunga
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={form.has_cadastur} onCheckedChange={(v) => setForm({ ...form, has_cadastur: v })} /> CADAstur Ativo
            </label>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Sobre mim (Apresentação para a equipe)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[100px]" placeholder="Breve resumo sobre a sua experiência ou observações extras para o administrador da ATMOS ver na hora de indicar passeios..." />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" size="lg" className="px-8 bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando Alterações..." : "Atualizar Perfil"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
