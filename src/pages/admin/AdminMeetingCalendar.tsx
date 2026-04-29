import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import WhatsAppPhone from "@/components/admin/WhatsAppPhone";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Video, RefreshCw, Mail, Building2, ExternalLink, MessageCircle, FileText, Kanban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function AdminMeetingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prospect, setProspect] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rescheduleHistory, setRescheduleHistory] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pipelineStage, setPipelineStage] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [linkedProposal, setLinkedProposal] = useState<any | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();

  const fetchEvents = useCallback(async () => {
    const { data } = await db.from("calendar_events")
      .select("*, prospects(id, name, company_name, email, phone, tags, segment, stage_id), sellers(name)")
      .eq("segment", "b2b")
      .gte("event_date", monthStart.toISOString())
      .lte("event_date", monthEnd.toISOString())
      .order("event_date");
    setEvents(data ?? []);
  }, [monthStart.toISOString(), monthEnd.toISOString()]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, typeof events> = {};
    events.forEach(e => {
      const key = format(new Date(e.event_date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDay[format(selectedDate, "yyyy-MM-dd")] || [];
  }, [selectedDate, eventsByDay]);

  const alerts = useMemo(() => {
    const meetingsToday = events.filter(e => isSameDay(new Date(e.event_date), today));
    const next7 = events.filter(e => {
      const d = differenceInDays(new Date(e.event_date), today);
      return d > 0 && d <= 7;
    });
    return { meetingsToday, next7 };
  }, [events, today]);

  const openDetail = async (event: any) => {
    setSelectedEvent(event);
    const p = event.prospects || null;
    setProspect(p);
    setRescheduleHistory([]);
    setPipelineStage(null);
    setLinkedProposal(null);

    if (p?.stage_id) {
      const { data: stage } = await db.from("pipeline_stages")
        .select("name, color")
        .eq("id", p.stage_id)
        .maybeSingle();
      setPipelineStage(stage);
    }

    if (event.prospect_id) {
      const [{ data: interactions }, { data: proposals }] = await Promise.all([
        db.from("prospect_interactions")
          .select("*")
          .eq("prospect_id", event.prospect_id)
          .ilike("content", "%reagend%")
          .order("created_at", { ascending: false })
          .limit(20),
        db.from("proposals")
          .select("id, title, code, status, total, segment, start_date")
          .eq("prospect_id", event.prospect_id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setRescheduleHistory(interactions ?? []);
      setLinkedProposal(proposals?.[0] ?? null);
    }
  };

  const getMeetingUrl = (event: any) => {
    if (event.meeting_url) return event.meeting_url;
    // fallback: extract from description
    if (!event.description) return null;
    const match = event.description.match(/https?:\/\/[^\s|]+/);
    if (match) {
      const url = match[0];
      if (url.includes("api.calendly.com")) return null;
      return url;
    }
    return null;
  };

  const getProspectName = (event: any) => {
    return event.prospects?.name || event.title?.replace(/\s*-\s*Reunião.*$/i, "") || event.title;
  };

  const startPadding = getDay(startOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
    sent: { label: "Enviada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    negotiating: { label: "Negociando", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    accepted: { label: "Aceita", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    rejected: { label: "Rejeitada", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Calendário de Reuniões B2B</h1>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${alerts.meetingsToday.length > 0 ? "border-blue-500/50 bg-blue-50 dark:bg-blue-900/20" : "border-border bg-card"}`}>
          <Video className={`h-5 w-5 ${alerts.meetingsToday.length > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium">Reuniões hoje</p>
            <p className="text-xs text-muted-foreground">
              {alerts.meetingsToday.length > 0
                ? `${alerts.meetingsToday.length} reunião(ões)`
                : "Nenhuma reunião hoje"}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${alerts.next7.length > 0 ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20" : "border-border bg-card"}`}>
          <Clock className={`h-5 w-5 ${alerts.next7.length > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium">Próximos 7 dias</p>
            <p className="text-xs text-muted-foreground">
              {alerts.next7.length > 0 ? `${alerts.next7.length} reunião(ões)` : "Nenhuma agendada"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base capitalize">
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
              {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} className="bg-background min-h-[80px] md:min-h-[100px]" />)}
              {days.map(day => {
                const key = format(day, "yyyy-MM-dd");
                const dayMeetings = eventsByDay[key] || [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative min-h-[80px] md:min-h-[100px] p-1.5 text-left transition-colors bg-background hover:bg-muted/50 flex flex-col
                      ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                    `}
                  >
                    <span className={`text-xs font-medium mb-1 inline-flex items-center justify-center ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 font-bold" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-col gap-1 overflow-hidden flex-1">
                      {dayMeetings.slice(0, 3).map((e, idx) => (
                        <div
                          key={e.id + "-" + idx}
                          className="text-[11px] leading-tight px-1.5 py-1 rounded font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 truncate"
                        >
                          <span className="font-mono text-[10px] mr-1">
                            {format(new Date(e.event_date), "HH:mm")}
                          </span>
                          {getProspectName(e)}
                        </div>
                      ))}
                      {dayMeetings.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-medium">+{dayMeetings.length - 3} mais</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day detail panel */}
        <Card className="max-h-[700px] overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Clique em um dia para ver as reuniões.</p>
            ) : dayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião neste dia.</p>
            ) : (
              dayEvents.map(event => {
                const meetingLink = getMeetingUrl(event);
                const eventTime = format(new Date(event.event_date), "HH:mm");
                const isActive = selectedEvent?.id === event.id;

                return (
                  <button
                    key={event.id}
                    onClick={() => openDetail(event)}
                    className={`w-full text-left border rounded-lg p-4 transition-all space-y-2 ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono text-primary">{eventTime}</span>
                        {event.manychat_subscriber_id && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[10px]">
                            <MessageCircle className="h-3 w-3 mr-0.5" /> MC
                          </Badge>
                        )}
                      </div>
                      {event.event_type === "meeting" && <Video className="h-4 w-4 text-blue-500" />}
                    </div>

                    <p className="font-semibold text-sm">{getProspectName(event)}</p>
                    {event.prospects?.company_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {event.prospects.company_name}
                      </p>
                    )}

                    {meetingLink && (
                      <a
                        href={meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Acessar reunião
                      </a>
                    )}

                    {event.sellers?.name && (
                      <p className="text-xs text-muted-foreground">Resp: {event.sellers.name}</p>
                    )}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={open => { if (!open) setSelectedEvent(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Reunião</SheetTitle>
          </SheetHeader>

          {selectedEvent && (
            <div className="space-y-5 mt-4">
              {/* Dados do Cliente */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cliente</p>
                <p className="font-semibold text-lg">{getProspectName(selectedEvent)}</p>
                {prospect?.company_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {prospect.company_name}
                  </div>
                )}
                {prospect?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    {prospect.email}
                  </div>
                )}
                {prospect?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <WhatsAppPhone phone={prospect.phone} />
                  </div>
                )}
                {prospect?.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap pt-1">
                    {prospect.tags.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Reunião */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reunião</p>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-lg p-3 text-center min-w-[80px]">
                    <p className="text-2xl font-bold text-primary font-mono">
                      {format(new Date(selectedEvent.event_date), "HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedEvent.event_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {selectedEvent.sellers?.name && (
                      <p className="text-sm text-muted-foreground">Responsável: {selectedEvent.sellers.name}</p>
                    )}
                    {selectedEvent.manychat_subscriber_id && (
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[10px]">
                        <MessageCircle className="h-3 w-3 mr-0.5" /> ManyChat: {selectedEvent.manychat_subscriber_id}
                      </Badge>
                    )}
                    {selectedEvent.title?.includes("reagendada") && (
                      <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700 dark:text-yellow-400">
                        <RefreshCw className="h-3 w-3 mr-0.5" /> Reagendada
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meeting Link button */}
                {(() => {
                  const link = getMeetingUrl(selectedEvent);
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                    >
                      <Video className="h-4 w-4" /> Acessar link da reunião
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm text-muted-foreground">
                      <Video className="h-4 w-4" /> Link da reunião não disponível
                    </div>
                  );
                })()}
              </div>

              {/* Pipeline & Proposta */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pipeline & Proposta</p>

                <div className="flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Etapa:</span>
                  {pipelineStage ? (
                    <Badge
                      className="text-xs"
                      style={{ backgroundColor: pipelineStage.color + "22", color: pipelineStage.color, borderColor: pipelineStage.color }}
                    >
                      {pipelineStage.name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>

                {linkedProposal ? (
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{linkedProposal.code || linkedProposal.title}</span>
                      </div>
                      <Badge className={`text-[10px] ${statusLabels[linkedProposal.status]?.color || "bg-muted text-muted-foreground"}`}>
                        {statusLabels[linkedProposal.status]?.label || linkedProposal.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{linkedProposal.title}</p>
                    {linkedProposal.total > 0 && (
                      <p className="text-sm font-semibold">
                        R$ {Number(linkedProposal.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Sem proposta vinculada
                  </p>
                )}
              </div>

              {/* Histórico de Reagendamentos */}
              {rescheduleHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Histórico de Reagendamentos
                  </p>
                  <div className="space-y-2">
                    {rescheduleHistory.map(h => (
                      <div key={h.id} className="text-xs border border-border rounded p-2 space-y-0.5">
                        <p className="text-muted-foreground">
                          {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                        <p>{h.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelar Reunião */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Cancelar reunião
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá remover a reunião do calendário permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!selectedEvent) return;
                await db.from("calendar_events").delete().eq("id", selectedEvent.id);
                setSelectedEvent(null);
                setConfirmDelete(false);
                fetchEvents();
                toast.success("Reunião cancelada com sucesso");
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
