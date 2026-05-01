import React from "react";
import { Filter, Search } from "lucide-react";
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
      <div>
        <h1 className="text-3xl font-black text-admin-primary tracking-tight">Painel Executivo</h1>
        <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-[0.25em] mt-1">Analytics em Tempo Real Atmos</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {/* Segment Filter */}
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[110px] h-11 text-[11px] font-black uppercase tracking-widest bg-white border-admin-border/60 rounded-xl shadow-sm focus:ring-4 focus:ring-admin-primary/5 transition-all">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-admin-border shadow-2xl">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Period Toggle */}
        <div className="bg-admin-muted/50 p-1 rounded-xl border border-admin-border/40">
          <ToggleGroup 
            type="single" 
            value={period} 
            onValueChange={handlePeriodChange} 
            className="gap-1"
          >
            <ToggleGroupItem 
              value="7" 
              className="text-[10px] font-black h-8 px-3 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              7D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="30" 
              className="text-[10px] font-black h-8 px-3 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              30D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="90" 
              className="text-[10px] font-black h-8 px-3 rounded-lg data-[state=on]:bg-admin-primary data-[state=on]:text-white transition-all"
            >
              90D
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Custom Date Range */}
        <DateRangePicker dateRange={dateRange} onSelect={handleDateRangeChange} />
      </div>
    </div>
  );
}
