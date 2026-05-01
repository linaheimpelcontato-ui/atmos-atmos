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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="admin-card border-none shadow-sm">
            <CardContent className="pt-6 pb-5 px-6">
              <Skeleton className="h-5 w-5 mb-4 rounded-lg" />
              <Skeleton className="h-9 w-24 mb-2 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
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
            <Card className="admin-card border-none shadow-sm hover:shadow-xl transition-all duration-300 group">
              <CardContent className="pt-6 pb-5 px-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-admin-muted flex items-center justify-center group-hover:bg-admin-primary group-hover:text-white transition-all duration-300">
                    <Icon className="h-5 w-5 text-admin-primary group-hover:text-white transition-colors" />
                  </div>
                  {delta !== 0 && (
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(1)}%
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">{periodLabel}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-3xl font-black text-admin-primary tracking-tight">{k.value}</p>
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">{k.title}</p>
                </div>
                
                {/* B2B/B2C breakdown */}
                {k.showSegments && k.b2c !== null && k.b2b !== null && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-5 pt-4 border-t border-admin-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: B2C_COLOR }} />
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: B2C_COLOR }}>
                        B2C: {k.b2c} <span className="text-muted-foreground/40 font-bold">({k.b2cPct}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: B2B_COLOR }} />
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: B2B_COLOR }}>
                        B2B: {k.b2b} <span className="text-muted-foreground/40 font-bold">({k.b2bPct}%)</span>
                      </span>
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
