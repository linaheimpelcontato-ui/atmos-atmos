import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Calendar, Save, Globe, Linkedin, Instagram, Star, Cake, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";

interface Stage { id: string; name: string; color: string; }

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manychat", label: "ManyChat" },
  { value: "import", label: "Importação" },
];

const COMPANY_TYPES = [
  "DMC", "Agência Corporate", "Facilitador", "Plataforma", "Hub/Aceleradora",
  "Tour Operator", "OTA", "Receptivo Local", "Agência de Viagens", 
  "Operadora de Turismo", "Consultoria de Viagens", "MICE", "Outro"
];
const COMPANY_SEGMENTS_LIST = [
  "Wellness", "Adventure", "Luxury", "Corporate", "Ecoturismo",
  "MICE", "Cultural", "Gastronômico", "Religioso", "Sustentável", "Premium", "Econômico", "Outro"
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
          <Star className={`h-4 w-4 transition-colors ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}

function priorityToScore(p: string | null): number {
  if (p === "high") return 5;
  if (p === "low") return 1;
  return 3;
}

function scoreToPriority(s: number): string {
  if (s >= 4) return "high";
  if (s <= 2) return "low";
  return "medium";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ProspectTabGeneral({ prospect, stages, segment, onUpdate }: { prospect: any; stages: Stage[]; segment: string; onUpdate: (patch: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company_name: "", source: "manual", stage_id: "",
    tags: "", notes: "", type: "direct", country: "", target_market: "", website: "",
    potential: "medium", description: "", linkedin: "", instagram: "", next_followup_at: "",
    company_type: "", company_segment: "", birth_date: "",
    document: "", document_type: "cpf",
    custom_company_type: "", custom_company_segment: "",
    seller_id: "",
  });
  const [priorityScore, setPriorityScore] = useState(3);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("sellers").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setSellers(data);
    });
  }, []);

  useEffect(() => {
    if (prospect) {
      const companyTypeVal = prospect.company_type ?? "";
      const isCustomType = companyTypeVal && !COMPANY_TYPES.includes(companyTypeVal);
      const companySegmentVal = prospect.company_segment ?? "";
      const isCustomSegment = companySegmentVal && !COMPANY_SEGMENTS_LIST.includes(companySegmentVal);
      
      setForm({
        name: prospect.name ?? "",
        email: prospect.email ?? "",
        phone: prospect.phone ?? "",
        company_name: prospect.company_name ?? "",
        source: prospect.source ?? "manual",
        stage_id: prospect.stage_id ?? "",
        tags: (prospect.tags ?? []).join(", "),
        notes: prospect.notes ?? "",
        type: prospect.type ?? "direct",
        country: prospect.country ?? "",
        target_market: prospect.target_market ?? "",
        website: prospect.website ?? "",
        potential: prospect.potential ?? "medium",
        description: prospect.description ?? "",
        linkedin: prospect.linkedin ?? "",
        instagram: prospect.instagram ?? "",
        next_followup_at: prospect.next_followup_at ? prospect.next_followup_at.slice(0, 16) : "",
        company_type: isCustomType ? "Outro" : companyTypeVal,
        company_segment: isCustomSegment ? "Outro" : companySegmentVal,
        birth_date: prospect.birth_date ?? "",
        document: prospect.document ?? "",
        document_type: prospect.document_type ?? "cpf",
        custom_company_type: isCustomType ? companyTypeVal : "",
        custom_company_segment: isCustomSegment ? companySegmentVal : "",
        seller_id: prospect.seller_id ?? "",
      });
      setPriorityScore(priorityToScore(prospect.priority));
    }
  }, [prospect]);

  const handleSave = () => {
    const finalCompanyType = form.company_type === "Outro" ? form.custom_company_type : form.company_type;
    const finalCompanySegment = form.company_segment === "Outro" ? form.custom_company_segment : form.company_segment;
    
    onUpdate({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company_name: form.company_name || null,
      source: form.source,
      stage_id: form.stage_id || null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      notes: form.notes || null,
      type: form.type,
      country: form.country || null,
      target_market: form.target_market || null,
      website: form.website || null,
      priority: scoreToPriority(priorityScore),
      potential: form.potential,
      description: form.description || null,
      linkedin: form.linkedin || null,
      instagram: form.instagram || null,
      next_followup_at: form.next_followup_at || null,
      company_type: finalCompanyType || null,
      company_segment: finalCompanySegment || null,
      birth_date: form.birth_date || null,
      document: form.document || null,
      document_type: form.document ? form.document_type : null,
      seller_id: form.seller_id || null,
    });
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));
  const isB2B = segment === "b2b";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{isB2B ? "Nome Empresa *" : "Nome *"}</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <div className="flex items-center gap-2">
            <PhoneInput value={form.phone} onChange={v => set("phone", v)} className="flex-1" />
            {form.phone && <WhatsAppPhone phone={form.phone} className="shrink-0" />}
          </div>
        </div>
        {isB2B && (
          <>
            <div className="space-y-1.5">
              <Label>Tipo Empresa</Label>
              <Select value={form.company_type || "none"} onValueChange={v => set("company_type", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t === "Outro" ? "Outro..." : t}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.company_type === "Outro" && (
                <Input 
                  value={form.custom_company_type} 
                  onChange={e => set("custom_company_type", e.target.value)} 
                  placeholder="Digite o tipo de empresa"
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={form.company_segment || "none"} onValueChange={v => set("company_segment", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {COMPANY_SEGMENTS_LIST.map(s => <SelectItem key={s} value={s}>{s === "Outro" ? "Outro..." : s}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.company_segment === "Outro" && (
                <Input 
                  value={form.custom_company_segment} 
                  onChange={e => set("custom_company_segment", e.target.value)} 
                  placeholder="Digite o segmento"
                  className="mt-2"
                />
              )}
            </div>
          </>
        )}
        {!isB2B && (
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={form.company_name} onChange={e => set("company_name", e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Cake className="h-3.5 w-3.5" />Data de Nascimento</Label>
          <DatePicker value={form.birth_date} onChange={v => set("birth_date", v)} />
        </div>
        <div className="space-y-1.5">
          <Label>CPF / CNPJ</Label>
          <div className="flex gap-2">
            <Select value={form.document_type} onValueChange={v => set("document_type", v)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={form.document}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                const max = form.document_type === "cnpj" ? 14 : 11;
                set("document", raw.slice(0, max));
              }}
              placeholder={form.document_type === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Etapa</Label>
          <Select value={form.stage_id || "none"} onValueChange={v => set("stage_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Origem</Label>
          <Select value={form.source} onValueChange={v => set("source", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />Vendedor</Label>
          <Select value={form.seller_id || "none"} onValueChange={v => set("seller_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <StarRating value={priorityScore} onChange={setPriorityScore} />
        </div>
        <div className="space-y-1.5">
          <Label>Potencial</Label>
          <Select value={form.potential} onValueChange={v => set("potential", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POTENTIALS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>País</Label>
          <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="Brasil, EUA, UK..." />
        </div>
        <div className="space-y-1.5">
          <Label>Mercado-alvo</Label>
          <Input value={form.target_market} onChange={e => set("target_market", e.target.value)} placeholder="Aventura, Wellness..." />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Website</Label>
          <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" />LinkedIn</Label>
          <Input value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Instagram className="h-3.5 w-3.5" />Instagram</Label>
          <Input value={form.instagram} onChange={e => set("instagram", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tags (separar por vírgula)</Label>
        <Input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="vip, retorno, grupo" />
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Próximo follow-up</Label>
        <Input type="datetime-local" value={form.next_followup_at} onChange={e => set("next_followup_at", e.target.value)} />
      </div>

      <Button onClick={handleSave} className="w-full">
        <Save className="h-4 w-4 mr-1" /> Salvar alterações
      </Button>
    </div>
  );
}
