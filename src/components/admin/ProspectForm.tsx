import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Star } from "lucide-react";

const db = supabase as any;

interface Stage { id: string; name: string; }

interface ProspectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: "b2c" | "b2b";
  stages: Stage[];
  onSubmit: (data: Record<string, unknown>) => void;
  initial?: Record<string, unknown>;
  title?: string;
}

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manychat", label: "ManyChat" },
  { value: "import", label: "Importação" },
];

const COMPANY_TYPES = [
  { value: "DMC", label: "DMC" },
  { value: "Agência Corporate", label: "Agência Corporate" },
  { value: "Facilitador", label: "Facilitador" },
  { value: "Plataforma", label: "Plataforma" },
  { value: "Hub/Aceleradora", label: "Hub/Aceleradora" },
  { value: "Tour Operator", label: "Tour Operator" },
  { value: "OTA", label: "OTA (Online Travel Agency)" },
  { value: "Receptivo Local", label: "Receptivo Local" },
  { value: "Agência de Viagens", label: "Agência de Viagens" },
  { value: "Operadora de Turismo", label: "Operadora de Turismo" },
  { value: "Consultoria de Viagens", label: "Consultoria de Viagens" },
  { value: "MICE", label: "MICE" },
  { value: "Outro", label: "Outro..." },
];

const COMPANY_SEGMENTS = [
  { value: "Wellness", label: "Wellness" },
  { value: "Adventure", label: "Adventure" },
  { value: "Luxury", label: "Luxury" },
  { value: "Corporate", label: "Corporate" },
  { value: "Ecoturismo", label: "Ecoturismo" },
  { value: "MICE", label: "MICE" },
  { value: "Cultural", label: "Cultural" },
  { value: "Gastronômico", label: "Gastronômico" },
  { value: "Religioso", label: "Religioso" },
  { value: "Sustentável", label: "Sustentável" },
  { value: "Premium", label: "Premium" },
  { value: "Econômico", label: "Econômico" },
  { value: "Outro", label: "Outro..." },
];

const POTENTIALS = [
  { value: "low", label: "Baixo" },
  { value: "medium", label: "Médio" },
  { value: "high", label: "Alto" },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5">
          <Star className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}

export default function ProspectForm({ open, onOpenChange, segment, stages, onSubmit, initial, title }: ProspectFormProps) {
  const [name, setName] = useState((initial?.name as string) ?? "");
  const [email, setEmail] = useState((initial?.email as string) ?? "");
  const [phone, setPhone] = useState((initial?.phone as string) ?? "");
  const [companyName, setCompanyName] = useState((initial?.company_name as string) ?? "");
  const [source, setSource] = useState((initial?.source as string) ?? "manual");
  const [stageId, setStageId] = useState((initial?.stage_id as string) ?? "");
  const [tagsStr, setTagsStr] = useState(((initial?.tags as string[]) ?? []).join(", "));
  const [notes, setNotes] = useState((initial?.notes as string) ?? "");
  const [sellerId, setSellerId] = useState((initial?.seller_id as string) ?? "none");
  // B2B specific
  const [companyType, setCompanyType] = useState((initial?.company_type as string) ?? "");
  const [customCompanyType, setCustomCompanyType] = useState("");
  const [companySegment, setCompanySegment] = useState((initial?.company_segment as string) ?? "");
  const [customCompanySegment, setCustomCompanySegment] = useState("");
  const [country, setCountry] = useState((initial?.country as string) ?? "");
  const [targetMarket, setTargetMarket] = useState((initial?.target_market as string) ?? "");
  const [website, setWebsite] = useState((initial?.website as string) ?? "");
  const [linkedin, setLinkedin] = useState((initial?.linkedin as string) ?? "");
  const [instagram, setInstagram] = useState((initial?.instagram as string) ?? "");
  const [potential, setPotential] = useState((initial?.potential as string) ?? "medium");
  const [priorityScore, setPriorityScore] = useState((initial?.priority_score as number) ?? 3);

  // Initialize custom fields if initial value is not in predefined list
  useEffect(() => {
    if (initial?.company_type) {
      const val = initial.company_type as string;
      const exists = COMPANY_TYPES.some(t => t.value === val);
      if (!exists && val !== "Outro") {
        setCompanyType("Outro");
        setCustomCompanyType(val);
      }
    }
    if (initial?.company_segment) {
      const val = initial.company_segment as string;
      const exists = COMPANY_SEGMENTS.some(s => s.value === val);
      if (!exists && val !== "Outro") {
        setCompanySegment("Outro");
        setCustomCompanySegment(val);
      }
    }
  }, [initial]);

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers-active"],
    queryFn: async () => {
      const { data } = await db.from("sellers").select("id, name").eq("is_active", true).order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  useEffect(() => {
    // Se não tem stage_id inicial e stages já carregou, use o primeiro
    if (!initial?.stage_id && stages.length > 0 && !stageId) {
      setStageId(stages[0].id);
    }
  }, [stages, initial, stageId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name,
      email,
      phone,
      company_name: companyName,
      source,
      stage_id: stageId || null,
      tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
      notes,
      seller_id: (sellerId === "none" || !sellerId) ? null : sellerId,
    };
    if (segment === "b2b") {
      const finalCompanyType = companyType === "Outro" ? customCompanyType : companyType;
      const finalCompanySegment = companySegment === "Outro" ? customCompanySegment : companySegment;
      data.company_type = finalCompanyType || null;
      data.company_segment = finalCompanySegment || null;
      data.country = country || null;
      data.target_market = targetMarket || null;
      data.website = website || null;
      data.linkedin = linkedin || null;
      data.instagram = instagram || null;
      data.potential = potential;
      data.priority = priorityScore <= 2 ? "low" : priorityScore <= 3 ? "medium" : "high";
    }
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? "Novo Prospect"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name">{segment === "b2b" ? "Nome Empresa *" : "Nome *"}</Label>
              <Input id="pf-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-email">Email</Label>
              <Input id="pf-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-phone">Telefone</Label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            {segment === "b2b" && (
              <>
                <div className="space-y-1.5">
                  <Label>Tipo Empresa</Label>
                  <Select value={companyType} onValueChange={setCompanyType}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {companyType === "Outro" && (
                    <Input
                      value={customCompanyType}
                      onChange={e => setCustomCompanyType(e.target.value)}
                      placeholder="Digite o tipo de empresa"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <Select value={companySegment} onValueChange={setCompanySegment}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {companySegment === "Outro" && (
                    <Input
                      value={customCompanySegment}
                      onChange={e => setCustomCompanySegment(e.target.value)}
                      placeholder="Digite o segmento"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Brasil, EUA, UK..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Mercado-alvo</Label>
                  <Input value={targetMarket} onChange={e => setTargetMarket(e.target.value)} placeholder="Luxury, Wellness..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input value={instagram} onChange={e => setInstagram(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Potencial</Label>
                  <Select value={potential} onValueChange={setPotential}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POTENTIALS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <StarRating value={priorityScore} onChange={setPriorityScore} />
                </div>
              </>
            )}
            {segment === "b2c" && (
              <div className="space-y-1.5">
                <Label htmlFor="pf-company">Empresa</Label>
                <Input id="pf-company" value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-tags">Tags (separar por vírgula)</Label>
            <Input id="pf-tags" value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="vip, retorno, grupo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-notes">Notas</Label>
            <Textarea id="pf-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
