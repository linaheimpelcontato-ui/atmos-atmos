import { Clock, GripVertical, MessageSquare, Star } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  prospect: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_name: string | null;
    source: string;
    tags: string[];
    next_followup_at: string | null;
    company_type?: string | null;
    country?: string | null;
    potential?: string | null;
    priority?: string | null;
    last_interaction?: string | null;
    logo_url?: string | null;
    seller_name?: string | null;
  };
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  feedbackCount?: number;
  onFeedbackClick?: () => void;
}

const POTENTIAL_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-red-500/10 text-red-600 border-red-500/20",
};

const SOURCE_STYLES: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  site: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  indicacao: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  email: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  manychat: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  manual: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function MiniStars({ priority }: { priority: string | null | undefined }) {
  const score = priority === "high" ? 5 : priority === "low" ? 1 : 3;
  return (
    <div className="flex gap-0">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-2.5 w-2.5 ${i <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

export default function KanbanCard({ prospect, onClick, onDragStart, feedbackCount = 0, onFeedbackClick }: KanbanCardProps) {
  const daysAgo = prospect.last_interaction
    ? differenceInDays(new Date(), new Date(prospect.last_interaction))
    : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white/80 dark:bg-admin-surface/80 backdrop-blur-sm border border-admin-border/40 rounded-2xl p-4 cursor-grab active:cursor-grabbing shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:shadow-admin-primary/10 hover:border-admin-primary/30 transition-all duration-300 group"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {prospect.logo_url && (
              <img loading="lazy" src={prospect.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
            )}
            <p className="font-black text-sm truncate flex-1 text-admin-primary dark:text-white">{prospect.name}</p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${SOURCE_STYLES[prospect.source] ?? SOURCE_STYLES.manual}`}>
              {prospect.source}
            </span>
            {prospect.tags?.includes("manychat") && (
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0 rounded border border-purple-500/20 bg-purple-500/10 text-purple-600 shrink-0">MC</span>
            )}
          </div>

          {/* Country + Type */}
          {(prospect.country || prospect.company_type) && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {[prospect.country, prospect.company_type].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {prospect.potential && (
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${POTENTIAL_COLORS[prospect.potential] ?? ""}`}>
                {prospect.potential === "high" ? "Alto" : prospect.potential === "low" ? "Baixo" : "Médio"}
              </span>
            )}
            <MiniStars priority={prospect.priority} />
          </div>

          {prospect.seller_name && (
            <p className="text-[10px] text-primary/80 font-medium mt-1 truncate">🧑‍💼 {prospect.seller_name}</p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            {prospect.next_followup_at && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {format(new Date(prospect.next_followup_at), "dd/MM HH:mm", { locale: ptBR })}
              </p>
            )}
            {daysAgo !== null && (
              <p className="text-[10px] text-muted-foreground">
                {daysAgo === 0 ? "Hoje" : `${daysAgo}d atrás`}
              </p>
            )}
            {feedbackCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onFeedbackClick?.(); }}
                className="ml-auto flex items-center gap-1 bg-gradient-to-r from-destructive to-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:scale-105 transition-all"
              >
                <MessageSquare className="h-2.5 w-2.5" />
                {feedbackCount}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
