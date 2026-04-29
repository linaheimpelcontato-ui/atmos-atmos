import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  language: string | null;
  created_at: string | null;
}

const ALL_COLUMNS: ColumnInfo[] = [
  { key: "full_name", label: "Nome" },
  { key: "phone", label: "Telefone" },
  { key: "language", label: "Idioma" },
  { key: "created_at", label: "Data de Cadastro" },
];

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const filterState = useSmartFilters();
  const { hiddenColumns, hideColumn, showColumn, showAll, isHidden } = useHiddenColumns("admin-hidden-cols-users");

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, language, created_at")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const filtered = useMemo(() => {
    let result = profiles.filter((p) => {
      if (search && !(p.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (langFilter && (p.language || "pt") !== langFilter) return false;
      return true;
    });
    return filterState.applyFilters(result);
  }, [profiles, search, langFilter, filterState]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários Cadastrados</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} de {profiles.length} usuários</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProfiles} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={langFilter || "all"} onValueChange={(v) => setLangFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Todos os idiomas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os idiomas</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="en">Inglês</SelectItem>
            <SelectItem value="es">Espanhol</SelectItem>
          </SelectContent>
        </Select>
        <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto overscroll-x-contain max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader>
            <TableRow>
              {!isHidden("full_name") && <SmartTableHead label="Nome" sortKey="full_name" filterState={filterState} data={filtered} onHide={() => hideColumn("full_name")} />}
              {!isHidden("phone") && <SmartTableHead label="Telefone" sortKey="phone" filterState={filterState} data={filtered} className="hidden sm:table-cell" onHide={() => hideColumn("phone")} />}
              {!isHidden("language") && <SmartTableHead label="Idioma" sortKey="language" filterState={filterState} data={profiles} className="hidden sm:table-cell" onHide={() => hideColumn("language")} />}
              {!isHidden("created_at") && <SmartTableHead label="Data de Cadastro" sortKey="created_at" filterState={filterState} data={filtered} className="hidden md:table-cell" onHide={() => hideColumn("created_at")} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              filtered.map((profile) => (
                <TableRow key={profile.id}>
                  {!isHidden("full_name") && <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>}
                  {!isHidden("phone") && <TableCell className="hidden sm:table-cell text-sm"><WhatsAppPhone phone={profile.phone} /></TableCell>}
                  {!isHidden("language") && <TableCell className="hidden sm:table-cell text-sm uppercase">{profile.language || "pt"}</TableCell>}
                  {!isHidden("created_at") && <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {profile.created_at ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
