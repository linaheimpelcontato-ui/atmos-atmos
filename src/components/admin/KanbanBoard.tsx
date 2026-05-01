import { useState } from "react";
import KanbanCard from "./KanbanCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Stage { id: string; name: string; color: string; position: number; description?: string; }
interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string;
  tags: string[];
  next_followup_at: string | null;
  stage_id: string | null;
  company_type?: string | null;
  country?: string | null;
  potential?: string | null;
  priority?: string | null;
  last_interaction?: string | null;
  logo_url?: string | null;
  seller_name?: string | null;
}

interface KanbanBoardProps {
  stages: Stage[];
  prospects: Prospect[];
  onMoveProspect: (prospectId: string, newStageId: string) => void;
  onCardClick: (prospect: Prospect) => void;
  feedbackCounts?: Record<string, number>;
  onFeedbackClick?: (prospectId: string) => void;
}

export default function KanbanBoard({ stages, prospects, onMoveProspect, onCardClick, feedbackCounts, onFeedbackClick }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const sorted = [...stages].sort((a, b) => a.position - b.position);

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setOverStageId(stageId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedId) {
      const p = prospects.find(p => p.id === draggedId);
      if (p && p.stage_id !== stageId) {
        onMoveProspect(draggedId, stageId);
      }
    }
    setDraggedId(null);
    setOverStageId(null);
  };

  return (
    <div className="flex gap-4 pb-4 min-h-[40vh] md:min-h-[60vh] snap-x snap-mandatory md:snap-none min-w-max">
      {sorted.map(stage => {
        const stageProspects = prospects.filter(p => p.stage_id === stage.id);
        const isOver = overStageId === stage.id;
        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-[75vw] sm:w-72 rounded-[2rem] flex flex-col transition-all snap-start border border-admin-border/20 ${isOver ? "bg-admin-primary/10" : "bg-admin-muted/40"}`}
            onDragOver={e => handleDragOver(e, stage.id)}
            onDragLeave={() => setOverStageId(null)}
            onDrop={e => handleDrop(e, stage.id)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-admin-border/40 bg-white/40 backdrop-blur-sm rounded-t-2xl">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex-1 truncate">{stage.name}</span>
              {stage.description && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                      {stage.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
                {stageProspects.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-220px)]">
              {stageProspects.map(p => (
                <KanbanCard
                  key={p.id}
                  prospect={p}
                  onClick={() => onCardClick(p)}
                  onDragStart={(e) => {
                    setDraggedId(p.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  feedbackCount={feedbackCounts?.[p.id] ?? 0}
                  onFeedbackClick={() => onFeedbackClick?.(p.id)}
                />
              ))}
              {stageProspects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum prospect</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
