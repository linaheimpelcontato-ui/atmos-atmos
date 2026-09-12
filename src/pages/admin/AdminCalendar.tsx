import { isApprovedProposalStatus, APPROVED_PROPOSAL_STATUSES } from "@/lib/proposalStatus";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, ChevronRight, CalendarDays, Plus, MapPin, CheckSquare, 
  AlertTriangle, UserX, Clock, Users, Headset, Map, ExternalLink, 
  MessageSquarePlus, Phone, Mail, Building2, Tag, LayoutDashboard, Search, Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DEFAULT_CHECKLIST_TASKS = [
  "Confirmar guia indicado",
  "Encomendar lanche de trilha",
  "Reservar experiências",
  "Confirmar hospedagem",
  "Confirmar transfer",
];

/* ─── Rich Calendar Grid with mini-cards ─── */
function CalendarGrid({
  currentMonth, setCurrentMonth, selectedDate, setSelectedDate, proposalsByDay, colorFn,
}: {
  currentMonth: Date; setCurrentMonth: (fn: (d: Date) => Date) => void;
  selectedDate: Date | null; setSelectedDate: (d: Date) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposalsByDay: Record<string, any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorFn?: (item: any) => string;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const defaultColor = (p: any) =>
    p.segment === "b2b"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";

  const getColor = colorFn || defaultColor;

  return (
    <Card className="lg:col-span-2 rounded-[2rem] border-admin-border/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-admin-border/40">
        <div className="flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 bg-muted/30">{d}</div>
          ))}
          {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} className="bg-background min-h-[60px] md:min-h-[80px]" />)}
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const dayProposals = proposalsByDay[key] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const maxShow = 2;
            const extra = dayProposals.length - maxShow;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`relative min-h-[60px] md:min-h-[80px] p-1 text-left transition-colors bg-background hover:bg-muted/50 flex flex-col
                  ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${isToday ? "bg-accent/20" : ""}
                `}
              >
                <span className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {dayProposals.slice(0, maxShow).map((p, idx) => (
                    <div
                      key={p.id + "-" + idx}
                      className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium ${getColor(p)}`}
                    >
                      {p.prospects?.name || p.name || p.title}
                    </div>
                  ))}
                  {extra > 0 && (
                    <span className="text-[9px] text-muted-foreground font-medium">+{extra} mais</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── ATENDIMENTO TAB (antigo Comercial) ─── */
function AtendimentoTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterSegment, setFilterSegment] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prospects, setProspects] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [interactions, setInteractions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("meeting");
  const [formProspectId, setFormProspectId] = useState("none");
  const [formSellerId, setFormSellerId] = useState("none");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allProspects, setAllProspects] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellers, setSellers] = useState<any[]>([]);

  // Detail state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailProspect, setDetailProspect] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailStage, setDetailStage] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailProposals, setDetailProposals] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailSeller, setDetailSeller] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailLastInteraction, setDetailLastInteraction] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();

  const fetchData = useCallback(async () => {
    let pq = db.from("prospects")
      .select("id, name, company_name, next_followup_at, stage_id, segment, seller_id, email, phone, tags, notes")
      .not("next_followup_at", "is", null)
      .gte("next_followup_at", monthStart.toISOString())
      .lte("next_followup_at", monthEnd.toISOString())
      .order("next_followup_at");
    if (filterSegment !== "all") pq = pq.eq("segment", filterSegment);

    let eq = db.from("calendar_events")
      .select("*, sellers(name)")
      .gte("event_date", monthStart.toISOString())
      .lte("event_date", monthEnd.toISOString())
      .order("event_date");
    if (filterSegment !== "all") eq = eq.eq("segment", filterSegment);

    const iq = db.from("prospect_interactions")
      .select("id, prospect_id, type, content, created_at, prospects(name, company_name, segment)")
      .in("type", ["meeting", "call"])
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString())
      .order("created_at");

    const allPq = db.from("prospects").select("id, name, company_name, segment").order("name").limit(500);
    const sellersQ = db.from("sellers").select("id, name").eq("is_active", true).order("name");

    const [{ data: pData }, { data: eData }, { data: iData }, { data: apData }, { data: sData }] = await Promise.all([pq, eq, iq, allPq, sellersQ]);
    let filteredInteractions = iData ?? [];
    if (filterSegment !== "all") {
      filteredInteractions = filteredInteractions.filter((i: any) => i.prospects?.segment === filterSegment);
    }
    setProspects(pData ?? []);
    setEvents(eData ?? []);
    setInteractions(filteredInteractions);
    setAllProspects(apData ?? []);
    setSellers(sData ?? []);
  }, [monthStart.toISOString(), monthEnd.toISOString(), filterSegment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const itemsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    const addToDay = (key: string, item: any) => {
      if (!map[key]) map[key] = [];
      map[key].push(item);
    };
    prospects.forEach(p => {
      if (p.next_followup_at) {
        const key = format(new Date(p.next_followup_at), "yyyy-MM-dd");
        addToDay(key, { ...p, _type: "followup", segment: p.segment });
      }
    });
    events.forEach(e => {
      const key = format(new Date(e.event_date), "yyyy-MM-dd");
      addToDay(key, { ...e, _type: "event", name: e.title, segment: e.segment });
    });
    interactions.forEach(i => {
      const key = format(new Date(i.created_at), "yyyy-MM-dd");
      addToDay(key, { ...i, _type: "interaction", name: i.prospects?.name || i.content, segment: i.prospects?.segment });
    });
    return map;
  }, [prospects, events, interactions]);

  const alerts = useMemo(() => {
    const followupsNext7 = prospects.filter(p => {
      if (!p.next_followup_at) return false;
      const d = differenceInDays(new Date(p.next_followup_at), today);
      return d >= 0 && d <= 7;
    });
    const meetingsToday = [
      ...events.filter(e => e.event_type === "meeting" && isSameDay(new Date(e.event_date), today)),
      ...interactions.filter(i => i.type === "meeting" && isSameDay(new Date(i.created_at), today)),
    ];
    const totalPending = followupsNext7.length + events.filter(e => {
      const d = differenceInDays(new Date(e.event_date), today);
      return d >= 0 && d <= 7;
    }).length;
    return { followupsNext7, meetingsToday, totalPending };
  }, [prospects, events, interactions, today]);

  const dayItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return itemsByDay[key] || [];
  }, [selectedDate, itemsByDay]);

  // Fetch rich details when an item is selected
  const selectItem = async (item: any) => {
    setSelectedItem(item);
    setDetailProspect(null);
    setDetailStage(null);
    setDetailProposals([]);
    setDetailSeller(null);
    setDetailLastInteraction(null);
    setNoteText("");

    const prospectId = item.prospect_id || item.id;
    if (!prospectId) return;

    // Fetch prospect full data
    const { data: pData } = await db.from("prospects")
      .select("*")
      .eq("id", prospectId)
      .maybeSingle();
    setDetailProspect(pData);

    if (!pData) return;

    // Fetch stage, proposals, seller, last interaction in parallel
    const stageQ = pData.stage_id
      ? db.from("pipeline_stages").select("name, color").eq("id", pData.stage_id).maybeSingle()
      : Promise.resolve({ data: null });
    const proposalsQ = db.from("proposals")
      .select("id, code, title, status, segment, total")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(5);
    const sellerQ = pData.seller_id
      ? db.from("sellers").select("id, name, phone, email").eq("id", pData.seller_id).maybeSingle()
      : Promise.resolve({ data: null });
    const interQ = db.from("prospect_interactions")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(1);

    const [{ data: stData }, { data: prData }, { data: slData }, { data: liData }] = await Promise.all([stageQ, proposalsQ, sellerQ, interQ]);
    setDetailStage(stData);
    setDetailProposals(prData ?? []);
    setDetailSeller(slData);
    setDetailLastInteraction(liData?.[0] ?? null);
  };

  const addNote = async () => {
    if (!noteText.trim() || !detailProspect) return;
    setAddingNote(true);
    await db.from("prospect_interactions").insert({
      prospect_id: detailProspect.id,
      type: "note",
      content: noteText.trim(),
    });
    // Sync last_interaction on prospect
    await db.from("prospects").update({ last_interaction: new Date().toISOString() }).eq("id", detailProspect.id);
    setNoteText("");
    setAddingNote(false);
    toast({ title: "Nota adicionada" });
    const { data } = await db.from("prospect_interactions")
      .select("*").eq("prospect_id", detailProspect.id)
      .order("created_at", { ascending: false }).limit(1);
    setDetailLastInteraction(data?.[0] ?? null);
  };

  const assignSeller = async (sellerId: string) => {
    if (!detailProspect) return;
    await db.from("prospects").update({ seller_id: sellerId }).eq("id", detailProspect.id);
    const { data: slData } = await db.from("sellers").select("id, name, phone, email").eq("id", sellerId).maybeSingle();
    setDetailSeller(slData);
    setDetailProspect({ ...detailProspect, seller_id: sellerId });
    toast({ title: "Responsável atribuído" });
    fetchData();
  };

  const rescheduleEvent = async (newDate: string) => {
    if (!selectedItem) return;
    if (selectedItem._type === "event") {
      await db.from("calendar_events").update({ event_date: newDate }).eq("id", selectedItem.id);
      toast({ title: "Evento reagendado" });
    } else if (selectedItem._type === "followup") {
      await db.from("prospects").update({ next_followup_at: newDate }).eq("id", selectedItem.id);
      toast({ title: "Follow-up reagendado" });
    }
    setSelectedItem(null);
    fetchData();
  };

  const cancelEvent = async () => {
    if (!selectedItem || selectedItem._type !== "event") return;
    await db.from("calendar_events").delete().eq("id", selectedItem.id);
    toast({ title: "Evento cancelado" });
    setSelectedItem(null);
    fetchData();
  };


  const handleCreate = async () => {
    const prospectId = formProspectId !== "none" ? formProspectId : null;
    const sellerId = formSellerId !== "none" ? formSellerId : null;
    const prospect = allProspects.find(p => p.id === prospectId);
    const { error } = await db.from("calendar_events").insert({
      title: formTitle,
      event_date: formDate,
      event_type: formType,
      segment: prospect?.segment || (filterSegment !== "all" ? filterSegment : null),
      prospect_id: prospectId,
      seller_id: sellerId,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Evento criado" });
    setDialogOpen(false);
    fetchData();
  };

  const statusLabel = (s: string) => {
    if (isApprovedProposalStatus(s)) return "Aprovada";
    const map: Record<string, string> = { draft: "Rascunho", sent: "Enviada", rejected: "Recusada", cancelled: "Cancelada" };
    return map[s] || s;
  };

  return (
    <div className="space-y-8">
      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="h-24 w-24 text-yellow-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Follow-ups 7 dias</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${alerts.followupsNext7.length > 0 ? "text-yellow-600" : "text-admin-primary"}`}>
              {alerts.followupsNext7.length}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pendentes</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Headset className="h-24 w-24 text-blue-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Reuniões Hoje</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${alerts.meetingsToday.length > 0 ? "text-blue-600" : "text-admin-primary"}`}>
              {alerts.meetingsToday.length}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agendadas</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-orange-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Pendências</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-orange-600 tracking-tight">{alerts.totalPending}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ações</p>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-admin-border/40">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar atendimentos..." 
            className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-base" 
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[120px] font-bold text-xs uppercase tracking-wider">
                <Filter className="h-3 w-3 mr-2 opacity-40" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos Segmentos</SelectItem>
                <SelectItem value="b2c">B2C Turistas</SelectItem>
                <SelectItem value="b2b">B2B Imersões</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={d => { setSelectedDate(d); setSelectedItem(null); }}
          proposalsByDay={itemsByDay}
        />

        <Card className="max-h-[700px] overflow-y-auto rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm relative">
          <CardHeader className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-admin-border/40 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary">
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
              </CardTitle>
              <Button size="sm" variant="outline" className="rounded-xl font-bold text-[10px] uppercase tracking-wider h-8" onClick={() => {
                setFormTitle(""); setFormDate(selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : "");
                setFormType("meeting"); setFormProspectId("none"); setFormSellerId("none"); setDialogOpen(true);
              }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Evento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Clique em um dia para ver os compromissos.</p>
            ) : dayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
            ) : (
              dayItems.map((item, idx) => {
                const isActive = selectedItem?.id === item.id && selectedItem?._type === item._type;
                return (
                  <button
                    key={item.id || idx}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group ${isActive ? "border-admin-primary bg-admin-primary/[0.03] shadow-md shadow-admin-primary/5 scale-[1.02]" : "border-admin-border/60 bg-white hover:bg-admin-muted/50 hover:border-admin-primary/40 hover:translate-x-1"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-admin-primary leading-tight">{item.name || item.title || item.content}</p>
                        {item.company_name && <p className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {item.company_name}</p>}
                        {item.prospects?.company_name && <p className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {item.prospects.company_name}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-wider px-2 border-admin-primary/20 ${isActive ? "bg-admin-primary text-white border-none" : "text-admin-primary/60"}`}>
                          {item._type === "followup" ? "Follow-up" : item._type === "interaction" ? (item.type === "meeting" ? "Reunião" : "Ligação") : item.event_type === "meeting" ? "Reunião" : item.event_type === "reminder" ? "Lembrete" : "Follow-up"}
                        </Badge>
                        {item.segment && <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider px-2 text-muted-foreground/40">{item.segment}</Badge>}
                      </div>
                    </div>
                    {item.sellers?.name && <p className="text-[10px] font-bold text-muted-foreground/40 mt-3 border-t border-admin-border/40 pt-2 flex items-center gap-1.5"><Users className="h-3 w-3" /> Resp: {item.sellers.name}</p>}
                  </button>
                );
              })
            )}

            {/* Rich Detail Panel */}
            {selectedItem && detailProspect && (
              <div className="border-t border-border pt-4 space-y-3 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalhes do Atendimento</p>

                {/* Pipeline stage — colored badge */}
                {detailStage ? (
                  <Badge className="text-xs" style={{ backgroundColor: detailStage.color, color: "#fff" }}>
                    {detailStage.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Sem etapa definida</Badge>
                )}

                {/* Prospect info */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-semibold text-sm">{detailProspect.name}</p>
                  {detailProspect.company_name && (
                    <p className="flex items-center gap-1 text-muted-foreground"><Building2 className="h-3 w-3" /> {detailProspect.company_name}</p>
                  )}
                  {detailProspect.email && (
                    <p className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {detailProspect.email}</p>
                  )}
                  {detailProspect.phone && (
                    <p className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {detailProspect.phone}</p>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{detailProspect.segment?.toUpperCase()}</Badge>
                    {detailProspect.tags?.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[9px]"><Tag className="h-2.5 w-2.5 mr-0.5" />{t}</Badge>
                    ))}
                  </div>
                  {detailProspect.notes && <p className="text-muted-foreground italic">"{detailProspect.notes}"</p>}
                </div>

                {/* Seller — alert if missing, inline assign */}
                {detailSeller ? (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <p className="font-semibold">Vendedor responsável</p>
                    <p>{detailSeller.name}</p>
                    {detailSeller.phone && <p className="text-muted-foreground">{detailSeller.phone}</p>}
                    {detailSeller.email && <p className="text-muted-foreground">{detailSeller.email}</p>}
                  </div>
                ) : (
                  <div className="border border-destructive/50 bg-destructive/10 rounded p-2 text-xs space-y-2">
                    <div className="flex items-center gap-1.5">
                      <UserX className="h-4 w-4 text-destructive" />
                      <span className="font-semibold text-destructive">Nenhum responsável atribuído</span>
                    </div>
                    <Select onValueChange={assignSeller}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Atribuir vendedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Proposals — always show section */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Propostas vinculadas</p>
                  {detailProposals.length > 0 ? (
                    detailProposals.map(pr => (
                      <div key={pr.id} className="flex items-center justify-between bg-muted/50 rounded p-2 text-xs">
                        <div>
                          <span className="font-medium">{pr.code || "Sem código"}</span>
                          <Badge variant="outline" className="ml-1.5 text-[9px]">{statusLabel(pr.status)}</Badge>
                          {pr.total > 0 && <span className="ml-1 text-muted-foreground">R$ {pr.total.toLocaleString("pt-BR")}</span>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => navigate(`/admin/${pr.segment}/propostas?edit=${pr.id}`)}>
                          <ExternalLink className="h-3 w-3 mr-0.5" /> Abrir
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-muted/30 rounded p-2 text-xs text-muted-foreground space-y-1.5">
                      <p>Nenhuma proposta vinculada</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/admin/${detailProspect.segment}/propostas`)}>
                        <Plus className="h-3 w-3 mr-1" /> Criar Proposta
                      </Button>
                    </div>
                  )}
                </div>

                {/* Event / Follow-up actions */}
                {(selectedItem._type === "event" || selectedItem._type === "followup") && (
                  <div className="space-y-2 border border-border rounded p-2">
                    <p className="text-xs font-semibold text-muted-foreground">Ações</p>
                    {!showReschedule ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                          const currentDate = selectedItem._type === "event"
                            ? selectedItem.event_date
                            : selectedItem.next_followup_at;
                          setRescheduleDate(currentDate ? format(new Date(currentDate), "yyyy-MM-dd'T'HH:mm") : "");
                          setShowReschedule(true);
                        }}>
                          <Clock className="h-3 w-3 mr-1" /> Reagendar
                        </Button>
                        {selectedItem._type === "event" && (
                          !confirmCancel ? (
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setConfirmCancel(true)}>
                              Cancelar evento
                            </Button>
                          ) : (
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-destructive">Confirmar?</span>
                              <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => { cancelEvent(); setConfirmCancel(false); }}>Sim</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setConfirmCancel(false)}>Não</Button>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input type="datetime-local" className="h-8 text-xs" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => { rescheduleEvent(rescheduleDate); setShowReschedule(false); }} disabled={!rescheduleDate}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowReschedule(false)}>Voltar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Last interaction */}
                {detailLastInteraction && (
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-muted-foreground">Última interação</p>
                    <p className="text-muted-foreground">{format(new Date(detailLastInteraction.created_at), "dd/MM/yyyy HH:mm")} — {detailLastInteraction.type}</p>
                    <p className="italic">"{detailLastInteraction.content}"</p>
                  </div>
                )}

                {/* Add note */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MessageSquarePlus className="h-3 w-3" /> Adicionar nota</p>
                  <Textarea placeholder="Escreva uma nota..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-xs min-h-[60px]" />
                  <Button size="sm" onClick={addNote} disabled={addingNote || !noteText.trim()}>Salvar nota</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreate(); }}>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="reminder">Lembrete</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prospect (opcional)</Label>
              <Select value={formProspectId} onValueChange={setFormProspectId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {allProspects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.company_name ? `(${p.company_name})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável (Vendedor)</Label>
              <Select value={formSellerId} onValueChange={setFormSellerId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── ROTEIROS TAB ─── */
function RoteirosTab() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterSegment, setFilterSegment] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proposals, setProposals] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allChecklist, setAllChecklist] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [checklist, setChecklist] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [guides, setGuides] = useState<any[]>([]);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [guideProposalId, setGuideProposalId] = useState<string | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("none");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dayItems, setDayItems] = useState<any[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();

  const fetchData = useCallback(async () => {
    let q = db.from("proposals")
      .select("id, title, code, start_date, end_date, num_days, num_people, segment, status, prospect_id, guide_id, prospects(name, company_name), guides(name)")
      .not("start_date", "is", null)
      .in("status", APPROVED_PROPOSAL_STATUSES)
      .or(`and(start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}),and(start_date.gte.${format(monthStart, "yyyy-MM-dd")},start_date.lte.${format(monthEnd, "yyyy-MM-dd")})`)
      .order("start_date");
    if (filterSegment !== "all") q = q.eq("segment", filterSegment);
    const [{ data: pData }, { data: clData }, { data: gData }] = await Promise.all([
      q,
      db.from("itinerary_checklist").select("*"),
      db.from("guides").select("id, name").eq("is_active", true).order("name"),
    ]);
    setProposals(pData ?? []);
    setAllChecklist(clData ?? []);
    setGuides(gData ?? []);
  }, [monthStart.toISOString(), monthEnd.toISOString(), filterSegment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const proposalsByDay = useMemo(() => {
    const map: Record<string, typeof proposals> = {};
    proposals.forEach(p => {
      if (!p.start_date) return;
      const start = new Date(p.start_date);
      const end = p.end_date ? new Date(p.end_date) : start;
      eachDayOfInterval({ start, end }).forEach(d => {
        const key = format(d, "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(p);
      });
    });
    return map;
  }, [proposals]);

  const alerts = useMemo(() => {
    const noGuide = proposals.filter(p => !p.guide_id);
    const upcoming = proposals.filter(p => {
      if (!p.start_date) return false;
      const daysUntil = differenceInDays(new Date(p.start_date), today);
      return daysUntil >= 0 && daysUntil <= 7;
    });
    const upcomingWithPendingTasks = upcoming.filter(p => {
      const tasks = allChecklist.filter(t => t.proposal_id === p.id);
      return tasks.some(t => !t.is_done) || tasks.length === 0;
    });
    const totalPending = allChecklist.filter(t => {
      const prop = proposals.find(p => p.id === t.proposal_id);
      return prop && !t.is_done;
    }).length;
    return { noGuide, upcomingWithPendingTasks, totalPending };
  }, [proposals, allChecklist, today]);

  const dayProposals = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return proposalsByDay[key] || [];
  }, [selectedDate, proposalsByDay]);

  const openChecklist = async (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setDayItems([]);
    const { data } = await db.from("itinerary_checklist").select("*").eq("proposal_id", proposalId).order("created_at");
    const existing = data ?? [];
    if (existing.length === 0) {
      const inserts = DEFAULT_CHECKLIST_TASKS.map(t => ({ proposal_id: proposalId, task_label: t }));
      await db.from("itinerary_checklist").insert(inserts);
      const { data: seeded } = await db.from("itinerary_checklist").select("*").eq("proposal_id", proposalId).order("created_at");
      setChecklist(seeded ?? []);
    } else {
      setChecklist(existing);
    }
    if (selectedDate) {
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal?.start_date) {
        const dayNumber = differenceInDays(selectedDate, new Date(proposal.start_date)) + 1;
        if (dayNumber > 0) {
          const { data: items } = await db.from("proposal_day_items")
            .select("*").eq("proposal_id", proposalId).eq("day_number", dayNumber).order("item_index");
          setDayItems(items ?? []);
        }
      }
    }
  };

  const toggleTask = async (taskId: string, isDone: boolean) => {
    await db.from("itinerary_checklist").update({ is_done: !isDone }).eq("id", taskId);
    setChecklist(prev => prev.map(t => t.id === taskId ? { ...t, is_done: !isDone } : t));
  };

  const addCustomTask = async () => {
    if (!newTask.trim() || !selectedProposalId) return;
    const { data } = await db.from("itinerary_checklist").insert({ proposal_id: selectedProposalId, task_label: newTask.trim() }).select();
    if (data) setChecklist(prev => [...prev, ...data]);
    setNewTask("");
    toast({ title: "Tarefa adicionada" });
  };

  const assignGuide = async () => {
    if (!guideProposalId) return;
    const gid = selectedGuideId === "none" ? null : selectedGuideId;
    await db.from("proposals").update({ guide_id: gid }).eq("id", guideProposalId);
    toast({ title: gid ? "Guia atribuído" : "Guia removido" });
    setGuideDialogOpen(false);
    fetchData();
  };

  const getChecklistStats = (proposalId: string) => {
    const tasks = allChecklist.filter(t => t.proposal_id === proposalId);
    const done = tasks.filter(t => t.is_done).length;
    return { total: tasks.length, done, pct: tasks.length > 0 ? (done / tasks.length) * 100 : 0 };
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = { waterfall: "Cachoeira", experience: "Experiência", accommodation: "Hospedagem", service: "Serviço", transfer: "Transfer", meal: "Refeição", guide: "Guia" };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="h-24 w-24 text-yellow-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Próximos 7 dias</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${alerts.upcomingWithPendingTasks.length > 0 ? "text-yellow-600" : "text-admin-primary"}`}>
              {alerts.upcomingWithPendingTasks.length}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Roteiros Pendentes</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <UserX className="h-24 w-24 text-destructive" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Alerta Logística</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${alerts.noGuide.length > 0 ? "text-destructive" : "text-admin-primary"}`}>
              {alerts.noGuide.length}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem Guia</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[2rem] p-6 border border-admin-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-orange-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Checklist Mensal</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-orange-600 tracking-tight">{alerts.totalPending}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tarefas</p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {alerts.upcomingWithPendingTasks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-yellow-500/[0.03] border border-yellow-500/10 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 animate-pulse" />
                </div>
                <h3 className="font-black text-yellow-700 uppercase tracking-wider text-sm">Roteiros próximos com pendências</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {alerts.upcomingWithPendingTasks.map(p => {
                  const daysUntil = differenceInDays(new Date(p.start_date), today);
                  const stats = getChecklistStats(p.id);
                  return (
                    <motion.div 
                      key={p.id} 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-admin-border/40 group"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-admin-primary text-sm">{p.code} — {p.prospects?.name || p.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider px-2 border-admin-primary/20 text-admin-primary/60">{p.segment}</Badge>
                          <span className={`text-[10px] font-black ${daysUntil <= 2 ? "text-destructive" : "text-yellow-600"}`}>
                            {daysUntil === 0 ? "HOJE" : `${daysUntil}d`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-muted-foreground/60">{stats.done}/{stats.total} tarefas</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-admin-border/40">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar roteiros..." 
            className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-base" 
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <div className="flex items-center bg-admin-muted/40 rounded-2xl p-1 gap-1">
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="h-10 border-none bg-transparent hover:bg-white/50 rounded-xl transition-colors min-w-[120px] font-bold text-xs uppercase tracking-wider">
                <Filter className="h-3 w-3 mr-2 opacity-40" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all">Todos Segmentos</SelectItem>
                <SelectItem value="b2c">B2C Turistas</SelectItem>
                <SelectItem value="b2b">B2B Imersões</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={d => { setSelectedDate(d); setSelectedProposalId(null); setDayItems([]); }}
          proposalsByDay={proposalsByDay}
        />

        <Card className="max-h-[700px] overflow-y-auto rounded-[2rem] border-admin-border/60 shadow-sm bg-white/50 backdrop-blur-sm relative">
          <CardHeader className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-admin-border/40 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-admin-primary flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Clique em um dia para ver os roteiros.</p>
            ) : dayProposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum roteiro neste dia.</p>
            ) : (
              dayProposals.map(p => {
                const stats = getChecklistStats(p.id);
                const isExpanded = selectedProposalId === p.id;
                const proposalDayNumber = p.start_date ? differenceInDays(selectedDate!, new Date(p.start_date)) + 1 : null;
                return (
                  <div key={p.id} className={`border rounded-[2rem] p-5 space-y-4 transition-all duration-300 ${isExpanded ? "border-admin-primary bg-admin-primary/[0.03] shadow-lg shadow-admin-primary/5" : "border-admin-border/60 bg-white hover:border-admin-primary/40 hover:bg-admin-muted/50"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-admin-primary text-sm tracking-tight">{p.code || "Sem código"}</p>
                        {proposalDayNumber && <Badge variant="outline" className="text-[9px] font-black uppercase bg-admin-primary/5 border-admin-primary/20 text-admin-primary">Dia {proposalDayNumber}</Badge>}
                      </div>
                      <Badge
                        className={`text-[9px] font-black uppercase tracking-wider px-2 ${p.segment === "b2b" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}
                        variant="outline"
                      >
                        {p.segment === "b2b" ? "Imersão" : "Turista"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-admin-primary leading-tight">{p.prospects?.name || p.title}</p>
                      {p.prospects?.company_name && <p className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {p.prospects.company_name}</p>}
                    </div>

                    <div className="flex items-center justify-between border-y border-admin-border/40 py-3">
                      {p.guides?.name ? (
                        <span className="text-[10px] font-bold text-muted-foreground/80 flex items-center gap-1.5"><Users className="h-3 w-3" /> {p.guides.name}</span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-destructive/5 text-destructive border-destructive/20 px-2">Guia em aberto</Badge>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-[9px] font-black uppercase tracking-widest px-3 rounded-xl bg-admin-muted hover:bg-admin-primary hover:text-white transition-all"
                        onClick={() => { setGuideProposalId(p.id); setSelectedGuideId(p.guide_id || "none"); setGuideDialogOpen(true); }}
                      >
                        {p.guides?.name ? "Trocar" : "Atribuir"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {p.start_date && format(new Date(p.start_date), "dd/MM")} → {p.end_date && format(new Date(p.end_date), "dd/MM")}</span>
                      <span>{p.num_people} pax</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Checklist Roteiro</p>
                        <span className="text-[10px] font-black text-admin-primary tabular-nums">{stats.done}/{stats.total}</span>
                      </div>
                      <Progress value={stats.pct} className="h-1.5 bg-admin-muted rounded-full overflow-hidden" />
                    </div>

                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`w-full rounded-xl font-bold text-xs transition-all ${isExpanded ? "bg-admin-primary text-white border-none shadow-md shadow-admin-primary/20" : "border-admin-border/60 hover:bg-admin-muted"}`}
                      onClick={() => isExpanded ? setSelectedProposalId(null) : openChecklist(p.id)}
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-2" /> {isExpanded ? "Fechar checklist" : "Abrir checklist"}
                    </Button>

                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-admin-border/40 pt-6 space-y-6"
                      >
                        {dayItems.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Itinerário do Dia {proposalDayNumber}</p>
                            <div className="space-y-2">
                              {dayItems.map((item, idx) => (
                                <div key={item.id || idx} className="flex items-center gap-3 bg-white/40 border border-admin-border/20 rounded-2xl px-4 py-3 group/item">
                                  {item.start_time && <span className="font-mono text-[10px] font-bold text-admin-primary/40 min-w-[45px]">{item.start_time}</span>}
                                  <span className="font-bold text-xs text-admin-primary flex-1 truncate">{item.item_name || item.description || "—"}</span>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider bg-admin-primary/5 border-admin-primary/10 text-admin-primary/60 shrink-0">{categoryLabel(item.category)}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">{dayItems.length > 0 ? "Checklist de Apoio" : "Checklist Operacional"}</p>
                          <div className="space-y-1.5">
                            {checklist.map(t => (
                              <label key={t.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-admin-primary/5 cursor-pointer transition-all group">
                                <Checkbox 
                                  checked={t.is_done} 
                                  onCheckedChange={() => toggleTask(t.id, t.is_done)}
                                  className="h-5 w-5 rounded-lg border-admin-border/60 data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
                                />
                                <span className={`text-xs font-medium transition-all ${t.is_done ? "line-through text-muted-foreground/40 opacity-60" : "text-admin-primary"}`}>{t.task_label}</span>
                              </label>
                            ))}
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Input 
                              placeholder="Nova tarefa operacional..." 
                              value={newTask} 
                              onChange={e => setNewTask(e.target.value)} 
                              className="h-10 bg-white/40 border-admin-border/40 rounded-xl text-xs font-medium focus-visible:ring-admin-primary/20" 
                              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomTask())} 
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-10 w-10 rounded-xl bg-admin-primary/10 text-admin-primary hover:bg-admin-primary hover:text-white transition-all shrink-0" 
                              onClick={addCustomTask}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-admin-border/60 shadow-2xl p-0 overflow-hidden">
          <div className="bg-admin-primary/5 p-6 border-b border-admin-border/40">
            <h2 className="text-xl font-black text-admin-primary tracking-tight flex items-center gap-3">
              <div className="p-2 bg-admin-primary/10 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              Atribuir Guia Especialista
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Selecione o Guia</label>
              <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                <SelectTrigger className="h-12 rounded-2xl border-admin-border/60 bg-admin-muted/30 font-bold text-admin-primary px-4 focus:ring-admin-primary/20">
                  <SelectValue placeholder="Selecionar guia..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-admin-border/60 shadow-xl p-1">
                  <SelectItem value="none" className="rounded-xl font-bold text-destructive hover:bg-destructive/5">Sem guia (Remover)</SelectItem>
                  <div className="h-px bg-admin-border/20 my-1" />
                  {guides.map(g => (
                    <SelectItem key={g.id} value={g.id} className="rounded-xl font-bold text-admin-primary">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="ghost" 
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-admin-muted"
                onClick={() => setGuideDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-admin-primary/20"
                onClick={assignGuide}
              >
                Salvar Atribuição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── GERAL TAB (combined) ─── */
function GeralTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [atendimentoItems, setAtendimentoItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roteiroItems, setRoteiroItems] = useState<any[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const fetchData = useCallback(async () => {
    // Atendimento data
    const [{ data: pData }, { data: eData }, { data: iData }] = await Promise.all([
      db.from("prospects")
        .select("id, name, company_name, next_followup_at, segment")
        .not("next_followup_at", "is", null)
        .gte("next_followup_at", monthStart.toISOString())
        .lte("next_followup_at", monthEnd.toISOString()),
      db.from("calendar_events")
        .select("*")
        .gte("event_date", monthStart.toISOString())
        .lte("event_date", monthEnd.toISOString()),
      db.from("prospect_interactions")
        .select("id, prospect_id, type, content, created_at, prospects(name, company_name, segment)")
        .in("type", ["meeting", "call"])
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString()),
    ]);

    const atend: any[] = [];
    (pData ?? []).forEach((p: any) => {
      if (p.next_followup_at) atend.push({ ...p, _type: "followup", _source: "atendimento", segment: p.segment });
    });
    (eData ?? []).forEach((e: any) => {
      atend.push({ ...e, _type: "event", _source: "atendimento", name: e.title, segment: e.segment });
    });
    (iData ?? []).forEach((i: any) => {
      atend.push({ ...i, _type: "interaction", _source: "atendimento", name: i.prospects?.name || i.content, segment: i.prospects?.segment });
    });
    setAtendimentoItems(atend);

    // Roteiros data
    const { data: rData } = await db.from("proposals")
      .select("id, title, code, start_date, end_date, segment, prospect_id, prospects(name, company_name)")
      .not("start_date", "is", null)
      .in("status", APPROVED_PROPOSAL_STATUSES)
      .or(`and(start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}),and(start_date.gte.${format(monthStart, "yyyy-MM-dd")},start_date.lte.${format(monthEnd, "yyyy-MM-dd")})`);
    setRoteiroItems((rData ?? []).map((r: any) => ({ ...r, _source: "roteiro" })));
  }, [monthStart.toISOString(), monthEnd.toISOString()]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build combined by day
  const itemsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    const addToDay = (key: string, item: any) => {
      if (!map[key]) map[key] = [];
      map[key].push(item);
    };

    atendimentoItems.forEach(item => {
      const dateStr = item.next_followup_at || item.event_date || item.created_at;
      if (dateStr) addToDay(format(new Date(dateStr), "yyyy-MM-dd"), item);
    });

    roteiroItems.forEach(r => {
      if (!r.start_date) return;
      const start = new Date(r.start_date);
      const end = r.end_date ? new Date(r.end_date) : start;
      eachDayOfInterval({ start, end }).forEach(d => {
        addToDay(format(d, "yyyy-MM-dd"), r);
      });
    });

    return map;
  }, [atendimentoItems, roteiroItems]);

  const colorFn = (item: any) => {
    if (item._source === "atendimento") {
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300";
    }
    return item.segment === "b2b"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  };

  const dayItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return itemsByDay[key] || [];
  }, [selectedDate, itemsByDay]);

  const atendItems = dayItems.filter(i => i._source === "atendimento");
  const rotItems = dayItems.filter(i => i._source === "roteiro");

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-violet-200 dark:bg-violet-800" /> Atendimento</div>
        <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800" /> Roteiro B2C</div>
        <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-800" /> Roteiro B2B</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          proposalsByDay={itemsByDay}
          colorFn={colorFn}
        />

        <Card className="max-h-[600px] overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Clique em um dia para ver todos os compromissos.</p>
            ) : dayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item neste dia.</p>
            ) : (
              <>
                {atendItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300 flex items-center gap-1"><Headset className="h-3.5 w-3.5" /> Atendimento</p>
                    {atendItems.map((item, idx) => (
                      <div key={item.id || idx} className="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-900/10">
                        <p className="font-medium text-sm">{item.name || item.title || item.content}</p>
                        {item.company_name && <p className="text-xs text-muted-foreground">{item.company_name}</p>}
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700 dark:text-violet-300">
                            {item._type === "followup" ? "Follow-up" : item._type === "interaction" ? (item.type === "meeting" ? "Reunião" : "Ligação") : item.event_type === "meeting" ? "Reunião" : item.event_type === "reminder" ? "Lembrete" : "Follow-up"}
                          </Badge>
                          {item.segment && <Badge variant="outline" className="text-[10px]">{item.segment?.toUpperCase()}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rotItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><Map className="h-3.5 w-3.5" /> Roteiros</p>
                    {rotItems.map((p, idx) => (
                      <div key={p.id || idx} className={`border rounded-lg p-3 ${p.segment === "b2b" ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10" : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{p.code || "Sem código"}</p>
                          <Badge variant="outline" className={`text-[10px] ${p.segment === "b2b" ? "border-blue-300 text-blue-700 dark:text-blue-300" : "border-emerald-300 text-emerald-700 dark:text-emerald-300"}`}>
                            {p.segment === "b2b" ? "Imersão" : "Turista"}
                          </Badge>
                        </div>
                        <p className="text-sm">{p.prospects?.name || p.title}</p>
                        {p.prospects?.company_name && <p className="text-xs text-muted-foreground">{p.prospects.company_name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function AdminCalendar() {
  const [activeTab, setActiveTab] = useState("roteiros");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 min-w-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-admin-primary/10">
              <CalendarDays className="h-6 w-6 text-admin-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-admin-primary">Agenda & Roteiros</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-14">Gestão de atendimentos, viagens e logística</p>
        </div>
      </div>

      <Tabs defaultValue="roteiros" onValueChange={setActiveTab} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-admin-muted/40 p-1.5 rounded-2xl h-auto">
            <TabsTrigger value="roteiros" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
              <Map className="h-3.5 w-3.5" /> Roteiros
            </TabsTrigger>
            <TabsTrigger value="atendimento" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
              <Headset className="h-3.5 w-3.5" /> Atendimento
            </TabsTrigger>
            <TabsTrigger value="geral" className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-admin-primary data-[state=active]:shadow-sm transition-all flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5" /> Vista Geral
            </TabsTrigger>
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="roteiros" className="mt-0 focus-visible:ring-0">
              <RoteirosTab />
            </TabsContent>
            <TabsContent value="atendimento" className="mt-0 focus-visible:ring-0">
              <AtendimentoTab />
            </TabsContent>
            <TabsContent value="geral" className="mt-0 focus-visible:ring-0">
              <GeralTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}
