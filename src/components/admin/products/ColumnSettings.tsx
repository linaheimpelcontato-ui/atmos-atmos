import React from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings2, GripVertical, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_COLUMNS, type ColumnKey } from "./shared";

interface ColumnSettingsProps {
  visibleColumns: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

function SortableColumnItem({ 
  id, 
  label, 
  isVisible, 
  onToggle 
}: { 
  id: ColumnKey; 
  label: string; 
  isVisible: boolean; 
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isDragging ? "bg-admin-bg shadow-xl border border-admin-primary/10" : "hover:bg-admin-muted/50"}`}
    >
      <button 
        {...attributes} 
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-admin-primary transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1 flex items-center gap-3 cursor-pointer select-none" onClick={onToggle}>
        <Checkbox 
          checked={isVisible}
          onCheckedChange={onToggle}
          className="border-admin-border data-[state=checked]:bg-admin-primary data-[state=checked]:border-admin-primary"
        />
        <span className={`text-xs font-bold transition-colors ${isVisible ? "text-admin-primary" : "text-muted-foreground/40"}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function ColumnSettings({ visibleColumns, onChange }: ColumnSettingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Avoid accidental drags when clicking checkbox
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // We want to show all columns, but the visible ones first in their custom order
  const allColumnKeys = ALL_COLUMNS.map(c => c.key);
  
  // The current display order: visible columns first (in their order), then hidden ones
  const orderedKeys = React.useMemo(() => {
    const hidden = allColumnKeys.filter(k => !visibleColumns.includes(k));
    return [...visibleColumns, ...hidden];
  }, [visibleColumns, allColumnKeys]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedKeys.indexOf(active.id as ColumnKey);
    const newIndex = orderedKeys.indexOf(over.id as ColumnKey);

    const newOrderedKeys = arrayMove(orderedKeys, oldIndex, newIndex);
    
    // We only care about the order of VISIBLE columns for the table.
    // However, moving a hidden column should also work.
    // Let's filter back to only those that are currently visible to update the state.
    const newVisible = newOrderedKeys.filter(k => visibleColumns.includes(k));
    
    // If the dragged item was hidden but moved, we might want to auto-enable it?
    // User preference usually: if I drag it, I want to see it.
    if (!visibleColumns.includes(active.id as ColumnKey)) {
        newVisible.splice(newVisible.indexOf(active.id as ColumnKey), 0, active.id as ColumnKey);
        // This logic is complex, let's keep it simple: 
        // Just move the item in the list and keep visibility as is.
    }

    onChange(newOrderedKeys.filter(k => visibleColumns.includes(k)));
  };

  const toggleColumn = (key: ColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) {
        onChange(visibleColumns.filter(k => k !== key));
      }
    } else {
      // Add it at the end of visible columns
      onChange([...visibleColumns, key]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-11 px-4 rounded-xl border-admin-border/60 hover:border-admin-primary/40 hover:bg-admin-bg transition-all flex gap-2 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-admin-primary shadow-sm"
        >
          <Settings2 className="h-4 w-4" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-white border-none shadow-2xl rounded-[2rem] animate-in fade-in zoom-in-95 duration-200" align="end">
        <div className="px-3 pt-2 pb-4 border-b border-admin-border/50 mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-admin-primary">Configurar Tabela</p>
          <p className="text-[9px] text-muted-foreground font-medium">Arraste para reordenar a visualização</p>
        </div>

        <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={orderedKeys}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {orderedKeys.map((key) => {
                  const col = ALL_COLUMNS.find(c => c.key === key);
                  if (!col) return null;
                  return (
                    <SortableColumnItem 
                      key={key}
                      id={key}
                      label={col.label}
                      isVisible={visibleColumns.includes(key)}
                      onToggle={() => toggleColumn(key)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-4 pt-3 border-t border-admin-border/50 flex justify-between items-center px-2">
           <p className="text-[9px] font-bold text-muted-foreground/40">{visibleColumns.length} ativas</p>
           <Button 
            variant="ghost" 
            className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-admin-primary hover:bg-admin-primary/5 rounded-lg"
            onClick={() => onChange(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))}
           >
             Resetar
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
