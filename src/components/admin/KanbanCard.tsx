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
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SOURCE_STYLES: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  site: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  indicacao: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  email: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  manychat: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  manual: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
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
      className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {prospect.logo_url && (
              <img src={prospect.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
            )}
            <p className="font-medium text-sm truncate flex-1">{prospect.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full shrink-0 capitalize ${SOURCE_STYLES[prospect.source] ?? SOURCE_STYLES.manual}`}>
              {prospect.source}
            </span>
            {prospect.tags?.includes("manychat") && (
              <span className="text-[9px] font-bold px-1 py-0 rounded bg-purple-200 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">MC</span>
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
              <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full ${POTENTIAL_COLORS[prospect.potential] ?? ""}`}>
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
                className="ml-auto flex items-center gap-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold hover:opacity-80 transition-opacity"
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
