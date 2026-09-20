import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, ArrowRight, ArrowLeft, MessageCircle, Check, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackImmersionLeadSubmit, trackWhatsAppClick } from "@/lib/analytics";

const STORAGE_KEY = "atmos_immersion_form";

/* ── Form data ── */
interface FormData {
  nome: string;
  email: string;
  instagram_site: string;
  telefone: string;
  empresa: string;
  cargo: string;
  tipo_grupo: string;
  tipo_grupo_outro: string;
  num_participantes: string;
  quando: string;
  data_especifica: Date | undefined;
  data_especifica_fim: Date | undefined;
  experiencia_grupos: string;
  conhece_chapada: string;
  objetivos: string[];
  objetivo_outro: string;
  hospedagem: string;
  orcamento: string;
  como_conheceu: string;
  como_conheceu_outro: string;
  observacoes: string;
}

const emptyForm: FormData = {
  nome: "", email: "", instagram_site: "", telefone: "", empresa: "", cargo: "",
  tipo_grupo: "", tipo_grupo_outro: "", num_participantes: "", quando: "",
  data_especifica: undefined, data_especifica_fim: undefined,
  experiencia_grupos: "", conhece_chapada: "",
  objetivos: [], objetivo_outro: "", hospedagem: "",
  orcamento: "", como_conheceu: "", como_conheceu_outro: "", observacoes: "",
};

/* ── Options ── */
const tiposGrupo = [
  "Equipe/Time (offsite corporativo)",
  "Retiro wellness/transformacional",
  "Evento corporativo (team building, celebração)",
  "Grupo privado (família, amigos)",
];

const participantesOpts = [
  "8-12 pessoas", "12-16 pessoas", "16-20 pessoas",
  "20-24 pessoas", "24+ pessoas", "Ainda não sei",
];

const quandoOpts = [
  { value: "datas_definidas", label: "Datas já definidas" },
  { value: "1-2_meses", label: "Próximos 1-2 meses" },
  { value: "3-6_meses", label: "3-6 meses" },
  { value: "segundo_semestre_2026", label: "Segundo semestre 2026" },
  { value: "2027_ou_alem", label: "2027 ou além" },
  { value: "explorando", label: "Ainda estou explorando" },
];

const experienciaGruposOpts = [
  "Sim, já organizo com frequência",
  "Sim, algumas vezes",
  "Seria a primeira vez",
];

const conheceChapadaOpts = [
  "Sim, já visitei",
  "Não, seria a primeira vez",
  "Conheço, mas nunca organizei grupo lá",
];

const objetivosOpts = [
  "Fortalecimento de vínculos da equipe",
  "Alinhamento estratégico/planejamento",
  "Celebração ou marco importante",
  "Desenvolvimento pessoal/autocuidado",
  "Reconexão com a natureza",
  "Digital detox",
  "Atividades de aventura",
  "Práticas de bem-estar (yoga, meditação, etc)",
  "Momentos de reflexão/silêncio",
];

const orcamentoOpts = [
  "Prefiro não informar agora",
  "Até R$ 4.000/pessoa",
  "R$ 4.000 - R$ 6.000/pessoa",
  "R$ 6.000 - R$ 8.000/pessoa",
  "R$ 8.000 - R$ 10.000/pessoa",
  "Acima de R$ 10.000/pessoa",
];

const comoConheceuOpts = [
  "Indicação de amigo/colega", "Instagram", "Google", "LinkedIn",
  "Outra agência/DMC", "Eventos/feiras", "Artigo/matéria", "Já conhecia a Chapada",
];

/* ── Helpers ── */
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 2) return `+${d}`;
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`;
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}
const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isPhoneValid = (p: string) => p.replace(/\D/g, "").length >= 12;

/* ── Step definitions ── */
// "grouped" = all fields on one screen; "single" = one question per screen
type StepType = "intro" | "grouped" | "single-radio" | "single-radio-date" | "single-select" | "single-checkboxes" | "single-radio-horizontal";

interface StepDef {
  type: StepType;
  id: string;
  title?: string;
}

const STEPS: StepDef[] = [
  { type: "grouped", id: "identification", title: "📋 Sobre você e sua organização" },
  { type: "single-radio", id: "tipo_grupo", title: "🎯 Qual o tipo do seu grupo?" },
  { type: "single-select", id: "num_participantes", title: "👥 Número estimado de participantes?" },
  { type: "single-radio-date", id: "quando", title: "📅 Quando está pensando em realizar?" },
  { type: "single-radio", id: "experiencia_grupos", title: "🗺️ Você já organizou viagens em grupo antes?" },
  { type: "single-radio", id: "conhece_chapada", title: "🌿 Você já conhece a Chapada dos Veadeiros?" },
  { type: "single-checkboxes", id: "objetivos", title: "💚 O que vocês buscam nessa imersão?" },
  { type: "single-radio-horizontal", id: "hospedagem", title: "🏠 Já tem hospedagem definida?" },
  { type: "single-select", id: "orcamento", title: "💰 Orçamento estimado por pessoa?" },
  { type: "grouped", id: "final", title: "✨ Quase lá!" },
];

/* ── Component ── */
interface Props {
  onClose: () => void;
  wishlistItems?: { type: string; name: string; details?: string }[];
}

export default function ImmersionQuestionnaire({ onClose, wishlistItems }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data_especifica) parsed.data_especifica = new Date(parsed.data_especifica);
        if (parsed.data_especifica_fim) parsed.data_especifica_fim = new Date(parsed.data_especifica_fim);
        return { ...emptyForm, ...parsed };
      }
    } catch { /* ignore */ }
    return emptyForm;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const persist = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);
  useEffect(() => { persist(); }, [persist]);

  const set = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const current = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step) / (totalSteps - 1)) * 100;

  /* ── Validation ── */
  const validateIdentification = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Obrigatório";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!isEmailValid(form.email)) e.email = "Email inválido";
    if (!form.telefone.trim()) e.telefone = "Obrigatório";
    else if (!isPhoneValid(form.telefone)) e.telefone = "Telefone inválido";
    if (!form.empresa.trim()) e.empresa = "Obrigatório";
    if (!form.cargo.trim()) e.cargo = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canProceed = (): boolean => {
    if (!current) return false;
    switch (current.id) {
      case "identification": return true; // validated on next click
      case "tipo_grupo": return !!(form.tipo_grupo || form.tipo_grupo_outro.trim());
      case "num_participantes": return !!form.num_participantes;
      case "quando":
        if (!form.quando) return false;
        if (form.quando === "datas_definidas" && (!form.data_especifica || !form.data_especifica_fim)) return false;
        return true;
      case "experiencia_grupos": return !!form.experiencia_grupos;
      case "conhece_chapada": return !!form.conhece_chapada;
      case "objetivos": return form.objetivos.length > 0 || !!form.objetivo_outro.trim();
      case "hospedagem": return !!form.hospedagem;
      case "orcamento": return !!form.orcamento;
      case "final": return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (current.id === "identification" && !validateIdentification()) return;
    if (step < totalSteps - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    const objetivosFinal = [...form.objetivos];
    if (form.objetivo_outro.trim()) objetivosFinal.push(form.objetivo_outro.trim());

    const tipoGrupoFinal = form.tipo_grupo || form.tipo_grupo_outro;
    const comoConheceuFinal = form.como_conheceu === "Outro" ? form.como_conheceu_outro : form.como_conheceu;

    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      instagram_site: form.instagram_site.trim() || null,
      telefone: form.telefone.trim(),
      empresa: form.empresa.trim(),
      cargo: form.cargo.trim(),
      tipo_grupo: tipoGrupoFinal,
      num_participantes: form.num_participantes,
      quando: form.quando === "datas_definidas" && form.data_especifica
        ? `Datas definidas: ${format(form.data_especifica, "dd/MM/yyyy")}${form.data_especifica_fim ? ` a ${format(form.data_especifica_fim, "dd/MM/yyyy")}` : ""}`
        : quandoOpts.find(o => o.value === form.quando)?.label || form.quando,
      data_especifica: form.data_especifica ? format(form.data_especifica, "yyyy-MM-dd") : null,
      data_especifica_fim: form.data_especifica_fim ? format(form.data_especifica_fim, "yyyy-MM-dd") : null,
      experiencia_grupos: form.experiencia_grupos || null,
      conhece_chapada: form.conhece_chapada || null,
      objetivos: objetivosFinal,
      hospedagem: form.hospedagem || null,
      orcamento: form.orcamento || null,
      como_conheceu: comoConheceuFinal || null,
      observacoes: form.observacoes.trim() || null,
    };

    const { error } = await supabase.from("imersao_leads").insert(payload);
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
      setSubmitting(false);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setSuccess(true);

    setTimeout(() => {
      const quandoLabel = form.quando === "datas_definidas" && form.data_especifica
        ? `Datas definidas: ${format(form.data_especifica, "dd/MM/yyyy")}${form.data_especifica_fim ? ` a ${format(form.data_especifica_fim, "dd/MM/yyyy")}` : ""}`
        : quandoOpts.find(o => o.value === form.quando)?.label || form.quando;

      const lines = [
        `🏔️ *NOVA SOLICITAÇÃO DE IMERSÃO — ATMOS*`,
        ``,
        `👤 *Sobre o contato*`,
        `• Nome: ${form.nome.trim()}`,
        `• Empresa: ${form.empresa.trim()}`,
        `• Cargo: ${form.cargo.trim()}`,
        `• Email: ${form.email.trim()}`,
        `• Telefone: ${form.telefone.trim()}`,
        form.instagram_site.trim() ? `• Instagram/Site: ${form.instagram_site.trim()}` : null,
        ``,
        `🎯 *Sobre a imersão*`,
        `• Tipo de grupo: ${tipoGrupoFinal}`,
        `• Participantes: ${form.num_participantes}`,
        `• Quando: ${quandoLabel}`,
        form.experiencia_grupos ? `• Experiência com grupos: ${form.experiencia_grupos}` : null,
        form.conhece_chapada ? `• Conhece a Chapada: ${form.conhece_chapada}` : null,
        ``,
        `💚 *Objetivos*`,
        ...objetivosFinal.map(o => `• ${o}`),
        ``,
        form.hospedagem ? `🏠 Hospedagem: ${form.hospedagem}` : null,
        form.orcamento ? `💰 Orçamento: ${form.orcamento}` : null,
        comoConheceuFinal ? `📣 Como conheceu: ${comoConheceuFinal}` : null,
        form.observacoes.trim() ? `\n📝 Observações: ${form.observacoes.trim()}` : null,
        ...(wishlistItems && wishlistItems.length > 0 ? [
          ``,
          `📋 *Itens selecionados na Wishlist*`,
          ...wishlistItems.map(i => `• ${i.name}${i.details ? ` (${i.details})` : ""}`),
        ] : []),
      ].filter(Boolean).join("\n");

      const msg = encodeURIComponent(lines);
      trackImmersionLeadSubmit(tipoGrupoFinal);
      trackWhatsAppClick("immersion_form");
      window.location.href = `https://wa.me/5511933697400?text=${msg}`;
    }, 2000);
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="text-center py-12 space-y-4 animate-in fade-in">
        <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-2xl font-bold text-[#1A1612]">Recebemos suas informações!</h3>
        <p className="text-[#1A1612]/70">Redirecionando para o WhatsApp...</p>
      </div>
    );
  }

  /* ── Shared UI ── */
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-red-600 text-xs mt-1">{errors[field]}</p> : null;

  const radioClass = (selected: boolean) => cn(
    "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all text-sm",
    selected
      ? "border-accent bg-accent/10 text-[#1A1612] shadow-sm"
      : "border-[#1A1612]/15 text-[#1A1612]/70 hover:border-[#1A1612]/35"
  );

  const inputClass = "bg-white border-[#1A1612]/15 text-[#1A1612] placeholder:text-[#1A1612]/40";

  const ProgressBar = () => (
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-[#1A1612]/60 font-medium">
        {step + 1} / {totalSteps}
      </span>
      <button onClick={onClose} className="text-xs text-[#1A1612]/60 hover:text-[#1A1612] transition-colors">
        Cancelar
      </button>
    </div>
  );

  const ProgressBarLine = () => (
    <div className="w-full bg-[#1A1612]/10 rounded-full h-1.5 mb-8">
      <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
    </div>
  );

  const NavButtons = ({ showSubmit = false }: { showSubmit?: boolean }) => (
    <div className="flex items-center justify-between pt-6">
      <Button variant="ghost" onClick={handleBack} className="text-[#1A1612]/60 hover:text-[#1A1612] gap-1">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      {showSubmit ? (
        <Button onClick={handleSubmit} disabled={submitting}
          className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-full px-6">
          <MessageCircle className="h-5 w-5" />
          {submitting ? "Enviando..." : "Enviar e Falar com a ATMOS 💬"}
        </Button>
      ) : (
        <Button onClick={handleNext} disabled={!canProceed()}
          className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-full px-6">
          Próximo <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto animate-in slide-in-from-bottom-4 text-[#1A1612]">
      <ProgressBar />
      <ProgressBarLine />

      {/* ── IDENTIFICATION (grouped) ── */}
      {current.id === "identification" && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-[#1A1612]">{current.title}</h3>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Nome completo *</label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)}
              placeholder="Como podemos te chamar?" className={cn("mt-1", inputClass)} />
            <FieldError field="nome" />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Email *</label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="seu@email.com" className={cn("mt-1", inputClass)} />
            <FieldError field="email" />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Instagram ou Site</label>
            <Input value={form.instagram_site} onChange={e => set("instagram_site", e.target.value)}
              placeholder="@seuinstagram ou www.seusite.com" className={cn("mt-1", inputClass)} />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Telefone/WhatsApp *</label>
            <Input value={form.telefone} onChange={e => set("telefone", formatPhone(e.target.value))}
              placeholder="+55 (11) 99999-9999" className={cn("mt-1", inputClass)} />
            <p className="text-xs text-[#1A1612]/50 mt-1">Por onde você prefere conversar?</p>
            <FieldError field="telefone" />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Empresa/Organização *</label>
            <Input value={form.empresa} onChange={e => set("empresa", e.target.value)}
              placeholder="Nome da empresa ou organização" className={cn("mt-1", inputClass)} />
            <FieldError field="empresa" />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Seu cargo/função *</label>
            <Input value={form.cargo} onChange={e => set("cargo", e.target.value)}
              placeholder="Ex: CEO, RH, Facilitadora, Organizador de Eventos" className={cn("mt-1", inputClass)} />
            <FieldError field="cargo" />
          </div>

          <NavButtons />
        </div>
      )}

      {/* ── TIPO GRUPO (single radio) ── */}
      {current.id === "tipo_grupo" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {tiposGrupo.map(t => (
              <button key={t} onClick={() => { set("tipo_grupo", t); set("tipo_grupo_outro", ""); }}
                className={cn("w-full text-left", radioClass(form.tipo_grupo === t))}>
                {t}
              </button>
            ))}
            <div className={cn(radioClass(!form.tipo_grupo && !!form.tipo_grupo_outro), "w-full")}
              onClick={() => set("tipo_grupo", "")}>
              <span className="flex-shrink-0">Outro:</span>
              <Input value={form.tipo_grupo_outro} onClick={e => e.stopPropagation()}
                onChange={e => { set("tipo_grupo_outro", e.target.value); set("tipo_grupo", ""); }}
                placeholder="Descreva" className={cn("flex-1 h-8", inputClass)} />
            </div>
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── NUM PARTICIPANTES (single select as radio) ── */}
      {current.id === "num_participantes" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {participantesOpts.map(o => (
              <button key={o} onClick={() => set("num_participantes", o)}
                className={cn("w-full text-left", radioClass(form.num_participantes === o))}>
                {o}
              </button>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── QUANDO (single radio + date range) ── */}
      {current.id === "quando" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {quandoOpts.map(o => (
              <div key={o.value}>
                <button onClick={() => set("quando", o.value)}
                  className={cn("w-full text-left", radioClass(form.quando === o.value))}>
                  {o.label}
                </button>
                {o.value === "datas_definidas" && form.quando === "datas_definidas" && (
                  <div className="ml-4 mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left", inputClass, !form.data_especifica && "text-[#1A1612]/40")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.data_especifica ? format(form.data_especifica, "dd/MM/yyyy", { locale: ptBR }) : "Data de início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={form.data_especifica} onSelect={d => set("data_especifica", d)}
                            disabled={d => d < new Date()} className="p-3 pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left", inputClass, !form.data_especifica_fim && "text-[#1A1612]/40")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.data_especifica_fim ? format(form.data_especifica_fim, "dd/MM/yyyy", { locale: ptBR }) : "Data de fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={form.data_especifica_fim} onSelect={d => set("data_especifica_fim", d)}
                            disabled={d => d < (form.data_especifica || new Date())} className="p-3 pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── EXPERIENCIA GRUPOS (single radio) ── */}
      {current.id === "experiencia_grupos" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {experienciaGruposOpts.map(o => (
              <button key={o} onClick={() => set("experiencia_grupos", o)}
                className={cn("w-full text-left", radioClass(form.experiencia_grupos === o))}>
                {o}
              </button>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── CONHECE CHAPADA (single radio) ── */}
      {current.id === "conhece_chapada" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {conheceChapadaOpts.map(o => (
              <button key={o} onClick={() => set("conhece_chapada", o)}
                className={cn("w-full text-left", radioClass(form.conhece_chapada === o))}>
                {o}
              </button>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── OBJETIVOS (checkboxes) ── */}
      {current.id === "objetivos" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-[120px]">
            {objetivosOpts.map(obj => {
              const checked = form.objetivos.includes(obj);
              return (
                <label key={obj} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-sm",
                  checked ? "border-accent bg-accent/10 text-[#1A1612]" : "border-[#1A1612]/15 text-[#1A1612]/70 hover:border-[#1A1612]/35"
                )}>
                  <Checkbox checked={checked} onCheckedChange={c => {
                    set("objetivos", c ? [...form.objetivos, obj] : form.objetivos.filter(o => o !== obj));
                  }} className="border-[#1A1612]/30 data-[state=checked]:bg-accent data-[state=checked]:border-accent" />
                  {obj}
                </label>
              );
            })}
            <label className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-sm sm:col-span-2",
              form.objetivo_outro ? "border-accent bg-accent/10 text-[#1A1612]" : "border-[#1A1612]/15 text-[#1A1612]/70"
            )}>
              <span className="flex-shrink-0">Outro:</span>
              <Input value={form.objetivo_outro} onChange={e => set("objetivo_outro", e.target.value)}
                placeholder="Descreva" className={cn("flex-1 h-8", inputClass)} />
            </label>
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── HOSPEDAGEM (single radio horizontal) ── */}
      {current.id === "hospedagem" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <div className="space-y-2 min-h-[120px]">
            {["Sim, já temos hospedagem", "Gostaríamos de opções da ATMOS"].map(o => (
              <button key={o} onClick={() => set("hospedagem", o)}
                className={cn("w-full text-left", radioClass(form.hospedagem === o))}>
                {o}
              </button>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── ORÇAMENTO (single select as radio) ── */}
      {current.id === "orcamento" && (
        <div className="space-y-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#1A1612] leading-snug">{current.title}</h3>
          <p className="text-xs text-[#1A1612]/50 -mt-4">O valor reflete na quantidade de dias e nos itens que adicionamos ao roteiro</p>
          <div className="space-y-2 min-h-[120px]">
            {orcamentoOpts.map(o => (
              <button key={o} onClick={() => set("orcamento", o)}
                className={cn("w-full text-left", radioClass(form.orcamento === o))}>
                {o}
              </button>
            ))}
          </div>
          <NavButtons />
        </div>
      )}

      {/* ── FINAL (grouped) ── */}
      {current.id === "final" && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-[#1A1612]">{current.title}</h3>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Como conheceu a ATMOS?</label>
            <Select value={form.como_conheceu} onValueChange={v => set("como_conheceu", v)}>
              <SelectTrigger className={cn("mt-1", inputClass)}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {comoConheceuOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {form.como_conheceu === "Outro" && (
              <Input value={form.como_conheceu_outro} onChange={e => set("como_conheceu_outro", e.target.value)}
                placeholder="Conte-nos..." className={cn("mt-2", inputClass)} />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#1A1612]/80">Algo mais que queira compartilhar?</label>
            <Textarea value={form.observacoes} onChange={e => { if (e.target.value.length <= 500) set("observacoes", e.target.value); }}
              placeholder="Compartilhe detalhes, dúvidas ou expectativas que acha importante a gente saber antes de conversarmos."
              rows={4} className={cn("mt-1", inputClass)} />
            <p className="text-xs text-[#1A1612]/50 text-right mt-1">{form.observacoes.length}/500</p>
          </div>

          <NavButtons showSubmit />
        </div>
      )}
    </div>
  );
}
