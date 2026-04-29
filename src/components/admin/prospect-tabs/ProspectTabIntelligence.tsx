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
    <div className="space-y-6">
      {/* AI Enrichment Section */}
      <div className="border border-border rounded-lg p-5 bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Enriquecimento com IA</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          A IA vai pesquisar informações sobre {isB2B ? "a empresa" : "o prospect"} e preencher automaticamente campos como descrição, redes sociais, país e mercado-alvo.
        </p>
        <div className="space-y-2">
          <Label className="flex items-center gap-1 text-xs"><Globe className="h-3.5 w-3.5" />Website (opcional, melhora resultados)</Label>
          <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://empresa.com" className="h-9" />
        </div>
        <Button onClick={handleEnrich} disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Enriquecer com IA</>
          )}
        </Button>
      </div>

      {/* B2B Commercial Intelligence */}
      {isB2B && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Inteligência Comercial
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs"><DollarSign className="h-3.5 w-3.5" />Ticket Médio (R$)</Label>
              <Input type="number" value={form.estimated_ticket} onChange={e => setForm(f => ({ ...f, estimated_ticket: +e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volume Anual (grupos/ano)</Label>
              <Input type="number" value={form.annual_volume} onChange={e => setForm(f => ({ ...f, annual_volume: +e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs"><Users className="h-3.5 w-3.5" />Tamanho Típico Grupo</Label>
              <Input type="number" value={form.typical_group_size} onChange={e => setForm(f => ({ ...f, typical_group_size: +e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão (%)</Label>
              <Input type="number" step="0.5" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: +e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs"><MapPin className="h-3.5 w-3.5" />Opera Brasil?</Label>
              <Select value={form.operates_brazil} onValueChange={v => setForm(f => ({ ...f, operates_brazil: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Não sei</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="talvez">Talvez</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destinos Brasil</Label>
              <Input value={form.brazil_destinations} onChange={e => setForm(f => ({ ...f, brazil_destinations: e.target.value }))} placeholder="Chapada, Lençóis..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Principais Clientes / Cases</Label>
            <Textarea value={form.key_clients} onChange={e => setForm(f => ({ ...f, key_clients: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Diferenciais</Label>
            <Textarea value={form.differentials} onChange={e => setForm(f => ({ ...f, differentials: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notas Estratégicas</Label>
            <Textarea value={form.strategic_notes} onChange={e => setForm(f => ({ ...f, strategic_notes: e.target.value }))} rows={3} />
          </div>
          <Button onClick={handleSaveCommercial} className="w-full" variant="outline">
            <Save className="h-4 w-4 mr-1" /> Salvar Inteligência Comercial
          </Button>
        </div>
      )}

      {/* Current data preview (for non-B2B or quick glance) */}
      {!isB2B && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Dados atuais</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">País</span>
              <p>{prospect.country || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Mercado-alvo</span>
              <p>{prospect.target_market || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">LinkedIn</span>
              <p className="truncate">{prospect.linkedin || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Instagram</span>
              <p className="truncate">{prospect.instagram || "—"}</p>
            </div>
          </div>
          {prospect.description && (
            <div>
              <span className="text-muted-foreground text-xs">Descrição</span>
              <p className="text-sm whitespace-pre-wrap mt-1">{prospect.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
