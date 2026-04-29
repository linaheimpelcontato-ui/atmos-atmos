import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Building2, Eye } from "lucide-react";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  instagram_site: string | null;
  tipo_grupo: string;
  num_participantes: string;
  quando: string;
  data_especifica: string | null;
  data_especifica_fim: string | null;
  experiencia_grupos: string | null;
  conhece_chapada: string | null;
  objetivos: string[];
  hospedagem: string | null;
  orcamento: string | null;
  como_conheceu: string | null;
  observacoes: string | null;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  novo: "bg-yellow-100 text-yellow-800",
  contatado: "bg-blue-100 text-blue-800",
  encerrado: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  encerrado: "Encerrado",
};

const ALL_COLUMNS: ColumnInfo[] = [
  { key: "nome", label: "Nome" },
  { key: "empresa", label: "Empresa" },
  { key: "tipo_grupo", label: "Tipo Grupo" },
  { key: "num_participantes", label: "Participantes" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Data" },
];

export default function AdminImmersionLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const filterState = useSmartFilters();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns("admin-hidden-cols-imersao-leads");

  const fetchLeads = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from("imersao_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db
      .from("imersao_leads")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success("Status atualizado");
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.nome.toLowerCase().includes(q) || l.empresa.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
      }
      return true;
    });
    return filterState.applyFilters(result);
  }, [leads, search, statusFilter, filterState]);

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    ) : null;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Leads de Imersão</h1>
        </div>
        <p className="text-muted-foreground text-sm">Solicitações vindas do formulário de imersão</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, empresa ou email..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="contatado">Contatado</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto overscroll-x-contain">
        <Table>
          <TableHeader>
            <TableRow>
              {!isHidden("nome") && <SmartTableHead label="Nome" sortKey="nome" filterState={filterState} data={filtered} onHide={() => hideColumn("nome")} />}
              {!isHidden("empresa") && <SmartTableHead label="Empresa" sortKey="empresa" filterState={filterState} data={filtered} onHide={() => hideColumn("empresa")} />}
              {!isHidden("tipo_grupo") && <SmartTableHead label="Tipo Grupo" sortKey="tipo_grupo" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("tipo_grupo")} />}
              {!isHidden("num_participantes") && <SmartTableHead label="Participantes" sortKey="num_participantes" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("num_participantes")} />}
              {!isHidden("status") && <SmartTableHead label="Status" sortKey="status" filterState={filterState} data={leads} labelMap={statusLabels} onHide={() => hideColumn("status")} />}
              {!isHidden("created_at") && <SmartTableHead label="Data" sortKey="created_at" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("created_at")} />}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lead encontrado.</TableCell></TableRow>
            ) : filtered.map(lead => (
              <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(lead)}>
                {!isHidden("nome") && <TableCell className="font-medium">{lead.nome}</TableCell>}
                {!isHidden("empresa") && <TableCell>{lead.empresa}</TableCell>}
                {!isHidden("tipo_grupo") && <TableCell className="hidden md:table-cell text-sm">{lead.tipo_grupo}</TableCell>}
                {!isHidden("num_participantes") && <TableCell className="hidden md:table-cell text-sm">{lead.num_participantes}</TableCell>}
                {!isHidden("status") && <TableCell>
                  <Badge variant="secondary" className={statusColors[lead.status] || ""}>
                    {statusLabels[lead.status] || lead.status}
                  </Badge>
                </TableCell>}
                {!isHidden("created_at") && <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>}
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.nome}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Select value={selected.status} onValueChange={v => updateStatus(selected.id, v)}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Contato</h4>
                  <DetailRow label="Email" value={selected.email} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Telefone</span>
                    <WhatsAppPhone phone={selected.telefone} />
                  </div>
                  <DetailRow label="Empresa" value={selected.empresa} />
                  <DetailRow label="Cargo" value={selected.cargo} />
                  <DetailRow label="Instagram/Site" value={selected.instagram_site} />
                </div>

                {/* Immersion details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Detalhes da Imersão</h4>
                  <DetailRow label="Tipo de grupo" value={selected.tipo_grupo} />
                  <DetailRow label="Participantes" value={selected.num_participantes} />
                  <DetailRow label="Quando" value={selected.quando} />
                  {selected.data_especifica && (
                    <DetailRow label="Data início" value={format(new Date(selected.data_especifica), "dd/MM/yyyy")} />
                  )}
                  {selected.data_especifica_fim && (
                    <DetailRow label="Data fim" value={format(new Date(selected.data_especifica_fim), "dd/MM/yyyy")} />
                  )}
                  <DetailRow label="Experiência com grupos" value={selected.experiencia_grupos} />
                  <DetailRow label="Conhece a Chapada" value={selected.conhece_chapada} />
                </div>

                {/* Objectives */}
                {selected.objetivos && (selected.objetivos as string[]).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Objetivos</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.objetivos as string[]).map((o, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{o}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <DetailRow label="Hospedagem" value={selected.hospedagem} />
                <DetailRow label="Orçamento" value={selected.orcamento} />
                <DetailRow label="Como conheceu" value={selected.como_conheceu} />
                <DetailRow label="Observações" value={selected.observacoes} />

                <DetailRow label="Recebido em" value={format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
