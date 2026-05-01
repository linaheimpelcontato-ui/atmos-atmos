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
import { Search, RefreshCw, Users, Globe2, Calendar, ShieldCheck, Mail, Phone, MoreHorizontal, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartTableHead, useSmartFilters } from "@/components/admin/SmartTableHead";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { useHiddenColumns, HiddenColumnsButton, type ColumnInfo } from "@/hooks/useHiddenColumns";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 max-w-full mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <Users className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary uppercase tracking-tighter">Comunidade Atmos</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14 uppercase tracking-[0.2em] text-[10px] opacity-70">
            {filtered.length} exploradores registrados de um total de {profiles.length}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchProfiles} 
          disabled={loading}
          className="h-12 px-6 rounded-2xl border-admin-primary/20 text-admin-primary hover:bg-admin-primary hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Base
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-admin-border/40 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-admin-primary transition-colors" />
            <Input 
              placeholder="Buscar por nome de usuário..." 
              className="pl-11 h-12 bg-admin-muted/40 border-none rounded-2xl text-base focus-visible:ring-admin-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Select value={langFilter || "all"} onValueChange={(v) => setLangFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-12 bg-admin-muted/40 border-none rounded-2xl font-bold uppercase tracking-widest text-[10px] w-full lg:w-48 px-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 opacity-40" />
                  <SelectValue placeholder="Idioma" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="font-bold uppercase tracking-widest text-[10px]">Todos os idiomas</SelectItem>
                <SelectItem value="pt" className="font-bold uppercase tracking-widest text-[10px]">Português</SelectItem>
                <SelectItem value="en" className="font-bold uppercase tracking-widest text-[10px]">Inglês</SelectItem>
                <SelectItem value="es" className="font-bold uppercase tracking-widest text-[10px]">Espanhol</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-8 w-[1px] bg-admin-border/40 mx-1 hidden lg:block" />
            <HiddenColumnsButton columns={ALL_COLUMNS} hiddenColumns={hiddenColumns} showColumn={showColumn} showAll={showAll} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-admin-border/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-admin-border/60 bg-admin-muted/30 hover:bg-admin-muted/30">
                {!isHidden("full_name") && <SmartTableHead label="Usuário" sortKey="full_name" filterState={filterState} data={filtered} onHide={() => hideColumn("full_name")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6" />}
                {!isHidden("phone") && <SmartTableHead label="Contato" sortKey="phone" filterState={filterState} data={filtered} onHide={() => hideColumn("phone")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6" />}
                {!isHidden("language") && <SmartTableHead label="Preferência" sortKey="language" filterState={filterState} data={profiles} onHide={() => hideColumn("language")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-center" />}
                {!isHidden("created_at") && <SmartTableHead label="Ingresso" sortKey="created_at" filterState={filterState} data={filtered} onHide={() => hideColumn("created_at")} className="text-admin-primary/40 font-black uppercase tracking-widest text-[10px] p-6 text-right" />}
                <th className="w-20 p-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <TableRow className="border-none">
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 border-4 border-admin-primary/10 border-t-admin-primary rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-primary/30">Mapeando base de dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow className="border-none">
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Users className="h-12 w-12" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Nenhum explorador encontrado</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((profile) => (
                    <motion.tr 
                      key={profile.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group transition-all duration-300 hover:bg-admin-muted/50 border-b border-admin-border/40 last:border-none"
                    >
                      {!isHidden("full_name") && (
                        <TableCell className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-admin-primary/5 flex items-center justify-center text-admin-primary/30 group-hover:bg-admin-primary group-hover:text-white transition-all duration-500">
                              <UserCircle2 className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-admin-primary uppercase tracking-tight text-sm leading-none">{profile.full_name || "Membro Anônimo"}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-1">ID: {profile.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {!isHidden("phone") && (
                        <TableCell className="p-6">
                          <div className="flex items-center gap-3">
                            <WhatsAppPhone phone={profile.phone} className="text-xs font-bold" />
                          </div>
                        </TableCell>
                      )}
                      {!isHidden("language") && (
                        <TableCell className="p-6 text-center">
                          <Badge variant="outline" className="rounded-lg px-3 py-1 text-[10px] font-black uppercase bg-admin-muted text-admin-primary/60 border-none tracking-widest">
                            {profile.language || "pt"}
                          </Badge>
                        </TableCell>
                      )}
                      {!isHidden("created_at") && (
                        <TableCell className="p-6 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-admin-primary/80">
                              <Calendar className="h-3 w-3 opacity-30" />
                              {profile.created_at ? format(new Date(profile.created_at), "dd MMM yyyy", { locale: ptBR }) : "—"}
                            </div>
                            <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-tighter">Data oficial de registro</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="p-6 text-right">
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-admin-primary hover:text-white">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
