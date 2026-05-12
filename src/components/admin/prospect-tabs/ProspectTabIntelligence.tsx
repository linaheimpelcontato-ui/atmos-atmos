import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, Globe, Sparkles, Save, DollarSign, Users, MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProspectTabIntelligence({ prospect, onUpdate, segment }: { prospect: any; onUpdate: (patch: Record<string, unknown>) => void; segment?: string }) {
  const [loading, setLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(prospect.website ?? "");
  const isB2B = segment === "b2b";

  // B2B commercial intelligence fields
  const [form, setForm] = useState({
    estimated_ticket: 0,
    annual_volume: 0,
    typical_group_size: 0,
    operates_brazil: "unknown",
    brazil_destinations: "",
    commission_rate: 0,
    key_clients: "",
    differentials: "",
    strategic_notes: "",
  });

  useEffect(() => {
    if (prospect && isB2B) {
      setForm({
        estimated_ticket: prospect.estimated_ticket ?? 0,
        annual_volume: prospect.annual_volume ?? 0,
        typical_group_size: prospect.typical_group_size ?? 0,
        operates_brazil: prospect.operates_brazil ?? "unknown",
        brazil_destinations: prospect.brazil_destinations ?? "",
        commission_rate: prospect.commission_rate ?? 0,
        key_clients: prospect.key_clients ?? "",
        differentials: prospect.differentials ?? "",
        strategic_notes: prospect.strategic_notes ?? "",
      });
    }
  }, [prospect, isB2B]);

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-prospect", {
        body: {
          name: prospect.name,
          company_name: prospect.company_name,
          website: websiteUrl || prospect.website,
          country: prospect.country,
        },
      });
      if (error) throw error;
      if (data?.result) {
        const patch: Record<string, unknown> = {};
        if (data.result.description) patch.description = data.result.description;
        if (data.result.linkedin) patch.linkedin = data.result.linkedin;
        if (data.result.instagram) patch.instagram = data.result.instagram;
        if (data.result.country) patch.country = data.result.country;
        if (data.result.target_market) patch.target_market = data.result.target_market;
        if (data.result.website && !prospect.website) patch.website = data.result.website;
        if (Object.keys(patch).length > 0) {
          onUpdate(patch);
          toast({ title: "Dados enriquecidos com sucesso!" });
        } else {
          toast({ title: "Nenhum dado novo encontrado" });
        }
      }
    } catch (err) {
      toast({ title: "Erro ao enriquecer", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommercial = () => {
    onUpdate({
      estimated_ticket: form.estimated_ticket,
      annual_volume: form.annual_volume,
      typical_group_size: form.typical_group_size,
      operates_brazil: form.operates_brazil,
      brazil_destinations: form.brazil_destinations || null,
      commission_rate: form.commission_rate,
      key_clients: form.key_clients || null,
      differentials: form.differentials || null,
      strategic_notes: form.strategic_notes || null,
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
      {/* AI Enrichment Section */}
      <div className="relative overflow-hidden border border-admin-border/40 rounded-[2.5rem] p-10 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)] group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <Brain className="w-32 h-32 text-admin-primary" />
        </div>

        <div className="relative space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-admin-primary/5 rounded-2xl shadow-sm">
              <Brain className="h-6 w-6 text-admin-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-[0.2em] text-admin-primary leading-none">Inteligência Atmos IA</h3>
              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Web Analysis & Data Enrichment</p>
            </div>
          </div>
          
          <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-2xl">
            Nossa Inteligência Artificial analisará o ecossistema digital do cliente em tempo real, extraindo perfis estratégicos, presença social e posicionamento de mercado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Domínio Corporativo
              </Label>
              <Input 
                value={websiteUrl} 
                onChange={e => setWebsiteUrl(e.target.value)} 
                placeholder="https://empresa.com" 
                className="h-12 rounded-xl border-admin-border/60 bg-white focus:ring-admin-primary/20 transition-all font-medium px-4" 
              />
            </div>

            <Button 
              onClick={handleEnrich} 
              disabled={loading} 
              className="h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-admin-primary/10 transition-all hover:scale-[1.02] bg-admin-primary hover:bg-admin-primary/90 px-8"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sincronizando Ecossistema...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Enriquecer Perfil</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* B2B Commercial Intelligence */}
      {isB2B && (
        <div className="space-y-10 px-2 pt-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-admin-primary/5 rounded-2xl">
              <Briefcase className="h-5 w-5 text-admin-primary" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary leading-none">Métricas de Inteligência Comercial</h4>
              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Dados Estratégicos B2B</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Ticket Médio de Venda (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                <Input type="number" value={form.estimated_ticket} onChange={e => setForm(f => ({ ...f, estimated_ticket: +e.target.value }))} className="h-12 rounded-xl border-admin-border/60 pl-10 font-medium" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Volume Anual Estimado (grupos/ano)</Label>
              <Input type="number" value={form.annual_volume} onChange={e => setForm(f => ({ ...f, annual_volume: +e.target.value }))} className="h-12 rounded-xl border-admin-border/60 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Tamanho Médio de Grupo</Label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                <Input type="number" value={form.typical_group_size} onChange={e => setForm(f => ({ ...f, typical_group_size: +e.target.value }))} className="h-12 rounded-xl border-admin-border/60 pl-10 font-medium" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Percentual de Comissão (%)</Label>
              <Input type="number" step="0.5" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: +e.target.value }))} className="h-12 rounded-xl border-admin-border/60 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Opera Destinos no Brasil?</Label>
              <Select value={form.operates_brazil} onValueChange={v => setForm(f => ({ ...f, operates_brazil: v }))}>
                <SelectTrigger className="h-12 rounded-xl border-admin-border/60 bg-white font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border/60">
                  <SelectItem value="unknown">Não identificado</SelectItem>
                  <SelectItem value="sim">Sim, opera regularmente</SelectItem>
                  <SelectItem value="nao">Não opera</SelectItem>
                  <SelectItem value="talvez">Em prospecção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Destinos Preferenciais no Brasil</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                <Input value={form.brazil_destinations} onChange={e => setForm(f => ({ ...f, brazil_destinations: e.target.value }))} placeholder="Ex: Amazônia, Pantanal, Nordeste..." className="h-12 rounded-xl border-admin-border/60 pl-10 font-medium" />
              </div>
            </div>
          </div>

          <div className="space-y-8 pt-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Principais Clientes / Case Studies</Label>
              <Textarea value={form.key_clients} onChange={e => setForm(f => ({ ...f, key_clients: e.target.value }))} rows={2} className="rounded-2xl border-admin-border/60 p-4 resize-none font-medium" placeholder="Liste clientes relevantes..." />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Diferenciais e Proposta de Valor</Label>
              <Textarea value={form.differentials} onChange={e => setForm(f => ({ ...f, differentials: e.target.value }))} rows={2} className="rounded-2xl border-admin-border/60 p-4 resize-none font-medium" placeholder="O que torna essa empresa única..." />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Notas Estratégicas de Mercado</Label>
              <Textarea value={form.strategic_notes} onChange={e => setForm(f => ({ ...f, strategic_notes: e.target.value }))} rows={4} className="rounded-2xl border-admin-border/60 p-4 resize-none font-medium" placeholder="Observações qualitativas para o time comercial..." />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveCommercial} className="h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-xl shadow-admin-primary/20 bg-admin-primary hover:bg-admin-primary/90 transition-all hover:scale-[1.02]">
              <Save className="h-4 w-4" /> Salvar Inteligência B2B
            </Button>
          </div>
        </div>
      )}

      {/* Preview Section for non-B2B */}
      {!isB2B && (
        <div className="space-y-10 px-2 pt-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-admin-primary/5 rounded-2xl">
              <Briefcase className="h-5 w-5 text-admin-primary" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary leading-none">Insights do Prospect</h4>
              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Visão Geral de Dados</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block">Origem Geográfica</span>
              <p className="text-sm font-black text-admin-primary">{prospect.country || "Não informado"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block">Mercado de Interesse</span>
              <p className="text-sm font-black text-admin-primary">{prospect.target_market || "Não informado"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block">LinkedIn</span>
              <p className="text-sm font-black text-admin-primary truncate">{prospect.linkedin || "—"}</p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block">Instagram</span>
              <p className="text-sm font-black text-admin-primary truncate">{prospect.instagram || "—"}</p>
            </div>
          </div>

          {prospect.description && (
            <div className="space-y-4 p-8 rounded-[2rem] bg-white border border-admin-border/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <Sparkles className="w-16 h-16 text-admin-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block">Análise de Perfil</span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap relative z-10">{prospect.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
