import React from "react";
import { Filter, Search, Calendar as CalendarIcon } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import DateRangePicker from "./DateRangePicker";
import { DateRange } from "react-day-picker";
import { motion } from "framer-motion";

interface DashboardFiltersProps {
  segmentFilter: string;
  setSegmentFilter: (v: any) => void;
  period: string;
  handlePeriodChange: (v: string) => void;
  dateRange: DateRange | undefined;
  handleDateRangeChange: (range: DateRange | undefined) => void;
}

export function DashboardFilters({
  segmentFilter,
  setSegmentFilter,
  period,
  handlePeriodChange,
  dateRange,
  handleDateRangeChange
}: DashboardFiltersProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-admin-border/40 shadow-sm"
    >
      <div className="space-y-1">
        <h1 className="text-4xl font-black text-admin-primary tracking-tighter">Painel Executivo</h1>
        <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Analytics em Tempo Real Atmos</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        {/* Segment Filter */}
        <div className="flex items-center gap-3 bg-admin-muted/30 p-1.5 rounded-2xl border border-admin-border/20">
          <div className="pl-3 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-admin-primary/40" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Segmento</span>
          </div>
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[120px] h-10 text-[10px] font-black uppercase tracking-widest bg-white border-none rounded-xl shadow-sm focus:ring-0 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-admin-border/40 shadow-2xl border-none">
              <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos</SelectItem>
              <SelectItem value="b2c" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">B2C Retail</SelectItem>
              <SelectItem value="b2b" className="text-[10px] font-black uppercase tracking-widest text-blue-600">B2B Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Period Toggle */}
        <div className="bg-admin-muted/30 p-1.5 rounded-2xl border border-admin-border/20 flex items-center gap-3">
           <div className="pl-3 flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 text-admin-primary/40" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Janela</span>
          </div>
          <ToggleGroup 
            type="single" 
            value={period} 
            onValueChange={handlePeriodChange} 
            className="gap-1 bg-white p-1 rounded-xl shadow-sm"
          >
            <ToggleGroupItem 
              value="7" 
              className="text-[9px] font-black h-8 w-10 p-0 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              7D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="30" 
              className="text-[9px] font-black h-8 w-10 p-0 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              30D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="90" 
              className="text-[9px] font-black h-8 w-10 p-0 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              90D
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Custom Date Range */}
        <div className="bg-admin-muted/30 p-1.5 rounded-2xl border border-admin-border/20">
          <DateRangePicker dateRange={dateRange} onSelect={handleDateRangeChange} />
        </div>
      </div>
    </motion.div>
  );
}
