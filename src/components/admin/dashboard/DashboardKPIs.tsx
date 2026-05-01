import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KPIData {
  title: string;
  value: string | number;
  icon: LucideIcon;
  delta: number;
  b2c?: number | null;
  b2b?: number | null;
  b2cPct?: number;
  b2bPct?: number;
  showSegments?: boolean;
}

interface DashboardKPIsProps {
  kpis: KPIData[];
  loading: boolean;
  periodLabel: string;
}

const B2C_COLOR = "hsl(142 71% 45%)"; // emerald
const B2B_COLOR = "hsl(217 91% 60%)"; // blue

export function DashboardKPIs({ kpis, loading, periodLabel }: DashboardKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardContent className="p-8">
              <Skeleton className="h-10 w-10 mb-6 rounded-2xl" />
              <Skeleton className="h-10 w-32 mb-2 rounded-xl" />
              <Skeleton className="h-4 w-40 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
      {kpis.map((k, idx) => {
        const Icon = k.icon;
        const delta = typeof k.delta === "number" ? k.delta : 0;
        const isPositive = delta >= 0;
        
        return (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:shadow-admin-primary/5 transition-all duration-500 group overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-admin-primary/5 flex items-center justify-center group-hover:bg-admin-primary group-hover:scale-110 transition-all duration-500 shadow-sm border border-admin-primary/10">
                    <Icon className="h-6 w-6 text-admin-primary group-hover:text-white transition-colors" />
                  </div>
                  {delta !== 0 && (
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-widest ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(1)}%
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-1">{periodLabel}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-4xl font-black text-admin-primary tracking-tighter leading-none">{k.value}</p>
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pt-1">{k.title}</p>
                </div>
                
                {/* B2B/B2C breakdown */}
                {k.showSegments && k.b2c !== null && k.b2b !== null && (
                  <div className="mt-8 pt-6 border-t border-admin-border/30 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: B2C_COLOR }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: B2C_COLOR }}>B2C Segment</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{k.b2c} <span className="text-[10px] text-muted-foreground/40">({k.b2cPct}%)</span></p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: B2B_COLOR }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: B2B_COLOR }}>B2B Segment</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{k.b2b} <span className="text-[10px] text-muted-foreground/40">({k.b2bPct}%)</span></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
