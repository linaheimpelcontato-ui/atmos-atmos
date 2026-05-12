import { Building2, User } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { Star } from "lucide-react";

export type ColumnKey = 
  | "segment" | "name" | "company_name" | "created_at" | "source" | "tags" | "stage_id" 
  | "_proposal_count" | "_proposal_total" | "last_interaction" | "next_followup_at" 
  | "phone" | "seller_name" | "potential" | "priority" | "birth_date" | "city" | "country";

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  b2bOnly?: boolean;
  b2cOnly?: boolean;
  defaultVisible?: boolean;
  labelMap?: Record<string, string>;
  valueExtractor?: (row: Record<string, unknown>) => unknown;
  render: (row: Record<string, unknown>, stages: { id: string; name: string }[]) => React.ReactNode;
}

const SOURCE_LABELS: Record<string, string> = {
  site: "Site", whatsapp: "WhatsApp", manychat: "ManyChat", manual: "Manual", import: "Importação",
};

const SOURCE_COLORS: Record<string, string> = {
  site: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  manychat: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  manual: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  import: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const POTENTIAL_LABELS: Record<string, string> = {
  high: "Alto", medium: "Médio", low: "Baixo",
};
const POTENTIAL_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta", medium: "Média", low: "Baixa",
};

function PriorityStars({ priority }: { priority: string | null }) {
  const score = priority === "high" ? 5 : priority === "low" ? 1 : 3;
  return (
    <div className="flex gap-0">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "segment", label: "Tipo", defaultVisible: true,
    render: (p) => (
      <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-none ${p.segment === "b2b" ? "bg-indigo-500/10 text-indigo-600" : "bg-rose-500/10 text-rose-600"}`}>
        {p.segment === "b2b" ? <Building2 className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
        {String(p.segment || "").toUpperCase()}
      </Badge>
    ),
  },
  {
    key: "name", label: "Nome", defaultVisible: true,
    render: (p) => <span className="font-bold text-admin-primary">{p.name as string}</span>,
  },
  {
    key: "company_name", label: "Empresa", b2bOnly: true, defaultVisible: true,
    render: (p) => <span className="text-xs font-medium text-muted-foreground">{(p.company_name as string) ?? "—"}</span>,
  },
  {
    key: "created_at", label: "Entrada", defaultVisible: true,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{p.created_at ? format(new Date(p.created_at as string), "dd/MM/yy") : "—"}</span>,
  },
  {
    key: "source", label: "Origem", labelMap: SOURCE_LABELS, defaultVisible: true,
    render: (p) => (
      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${SOURCE_COLORS[p.source as string] ?? "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}>
        {SOURCE_LABELS[p.source as string] ?? (p.source as string)}
      </span>
    ),
  },
  {
    key: "tags", label: "Tags", defaultVisible: true,
    valueExtractor: (row) => ((row.tags as string[]) ?? []).join(", "),
    render: (p) => (
      <div className="flex gap-1 flex-wrap">
        {((p.tags as string[]) ?? []).slice(0, 3).map((t: string) => (
          <Badge key={t} variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-admin-primary/5 border-admin-border/40 text-admin-primary px-2">{t}</Badge>
        ))}
      </div>
    ),
  },
  {
    key: "stage_id", label: "Etapa", defaultVisible: true,
    render: (p, stages) => {
      const name = stages.find(s => s.id === p.stage_id)?.name ?? "—";
      return <Badge variant="outline" className="text-[10px] font-bold border-admin-border/60 bg-white/50">{name}</Badge>;
    },
  },
  {
    key: "_proposal_count", label: "Propostas", defaultVisible: false,
    valueExtractor: (row) => (row as any)._proposal_count ?? 0,
    render: (p) => <span className="text-xs font-bold text-center block">{(p as any)._proposal_count ?? 0}</span>,
  },
  {
    key: "_proposal_total", label: "Valor Total", defaultVisible: false,
    valueExtractor: (row) => (row as any)._proposal_total ?? 0,
    render: (p) => {
      const val = (p as any)._proposal_total ?? 0;
      return <span className="text-xs font-bold text-admin-primary">{val > 0 ? `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—"}</span>;
    },
  },
  {
    key: "last_interaction", label: "Último Contato", defaultVisible: false,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{p.last_interaction ? format(new Date(p.last_interaction as string), "dd/MM/yy") : "—"}</span>,
  },
  {
    key: "next_followup_at", label: "Follow-up", defaultVisible: false,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{p.next_followup_at ? format(new Date(p.next_followup_at as string), "dd/MM/yy") : "—"}</span>,
  },
  {
    key: "phone", label: "Telefone", defaultVisible: false,
    render: (p) => p.phone ? <WhatsAppPhone phone={p.phone as string} /> : <span className="text-xs text-muted-foreground">—</span>,
  },
  {
    key: "seller_name", label: "Vendedor", defaultVisible: false,
    valueExtractor: (row) => (row as any).sellers?.name ?? "",
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{(p as any).sellers?.name || "—"}</span>,
  },
  {
    key: "potential", label: "Potencial", labelMap: POTENTIAL_LABELS, defaultVisible: false,
    render: (p) => POTENTIAL_LABELS[p.potential as string] ? (
      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${POTENTIAL_COLORS[p.potential as string]}`}>
        {POTENTIAL_LABELS[p.potential as string]}
      </span>
    ) : <span className="text-xs text-muted-foreground">—</span>,
  },
  {
    key: "priority", label: "Prioridade", labelMap: PRIORITY_LABELS, defaultVisible: false,
    render: (p) => <PriorityStars priority={p.priority as string | null} />,
  },
  {
    key: "birth_date", label: "Nascimento", defaultVisible: false,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{p.birth_date ? format(new Date(p.birth_date as string), "dd/MM") : "—"}</span>,
  },
  {
    key: "city", label: "Cidade", defaultVisible: false,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{(p.city as string) ?? "—"}</span>,
  },
  {
    key: "country", label: "País", defaultVisible: false,
    render: (p) => <span className="text-xs text-muted-foreground font-medium">{(p.country as string) ?? "—"}</span>,
  },
];

export const getRelevantColumns = (activeTab: string) => {
  if (activeTab === "b2b") return ALL_COLUMNS.filter(c => !c.b2cOnly).map(c => c.key);
  if (activeTab === "b2c") return ALL_COLUMNS.filter(c => !c.b2bOnly).map(c => c.key);
  return ALL_COLUMNS.map(c => c.key);
};
