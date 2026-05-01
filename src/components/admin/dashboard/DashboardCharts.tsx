import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts";
import { Globe, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardChartsProps {
  monthlyTrend: any[];
  funnelB2C: any[];
  funnelB2B: any[];
  langData: any[];
  quoteStatusData: any[];
  colors: string[];
}

const B2C_COLOR = "hsl(142 71% 45%)";
const B2B_COLOR = "hsl(217 91% 60%)";

export function DashboardCharts({ 
  monthlyTrend, 
  funnelB2C, 
  funnelB2B, 
  langData, 
  quoteStatusData,
  colors 
}: DashboardChartsProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-admin-border/40 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                  <span className="text-[11px] font-bold text-admin-primary/60">{p.name}:</span>
                </div>
                <span className="text-sm font-black tabular-nums" style={{ color: p.color || p.fill }}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Main Trend Chart */}
      <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden group">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-admin-primary/5 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-admin-primary" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Crescimento ao Longo do Tempo</CardTitle>
                <p className="text-[10px] font-medium text-muted-foreground/60 italic">Volume de novos usuários e imersões mensais</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ left: -20, right: 10, top: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradB2C" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={B2C_COLOR} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={B2C_COLOR} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradB2B" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={B2B_COLOR} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={B2B_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: "rgba(0,0,0,0.25)" }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: "rgba(0,0,0,0.25)" }} 
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="usuarios" 
                  stroke={B2C_COLOR} 
                  fill="url(#gradB2C)" 
                  strokeWidth={4} 
                  name="B2C (Usuários)" 
                  animationDuration={1500}
                  dot={{ r: 4, fill: "white", stroke: B2C_COLOR, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="b2b" 
                  stroke={B2B_COLOR} 
                  fill="url(#gradB2B)" 
                  strokeWidth={4} 
                  name="B2B (Imersões)" 
                  animationDuration={1500}
                  dot={{ r: 4, fill: "white", stroke: B2B_COLOR, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle" 
                  iconSize={10}
                  wrapperStyle={{ paddingBottom: "30px", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="p-8 pb-6 border-b border-admin-border/20">
             <div className="flex items-center gap-3">
              <div className="h-6 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Funil de Conversão B2C</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {funnelB2C.map((f, i) => (
              <div key={f.step} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-admin-primary/50">{f.step}</span>
                  <span className="text-sm font-black text-admin-primary tabular-nums">{f.value} <span className="text-muted-foreground/30 text-[10px] font-bold">({f.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-3 bg-admin-muted/40 rounded-full overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(f.pct, 2)}%` }}
                    transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
                    className="h-full rounded-full shadow-inner"
                    style={{ backgroundColor: B2C_COLOR, opacity: 1 - i * 0.12 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="p-8 pb-6 border-b border-admin-border/20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Funil de Conversão B2B</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {funnelB2B.map((f, i) => (
              <div key={f.step} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-admin-primary/50">{f.step}</span>
                  <span className="text-sm font-black text-admin-primary tabular-nums">{f.value} <span className="text-muted-foreground/30 text-[10px] font-bold">({f.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-3 bg-admin-muted/40 rounded-full overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(f.pct, 2)}%` }}
                    transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
                    className="h-full rounded-full shadow-inner"
                    style={{ backgroundColor: B2B_COLOR, opacity: 1 - i * 0.12 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden group">
          <CardHeader className="p-8 pb-4">
             <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-admin-primary/5 flex items-center justify-center">
                <Globe className="h-4 w-4 text-admin-primary" />
              </div>
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Idiomas dos Usuários</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-12">
              <div className="h-[200px] w-1/2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={langData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" cy="50%" 
                      innerRadius={60} outerRadius={85}
                      paddingAngle={8}
                    >
                      {langData.map((_, i) => (
                        <Cell 
                          key={i} 
                          fill={colors[i % colors.length]} 
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-admin-primary tracking-tighter">
                    {langData.reduce((s, d) => s + d.value, 0)}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Total</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                {langData.map((l, i) => {
                  const total = langData.reduce((s, d) => s + d.value, 0);
                  const pct = (l.value / total) * 100;
                  return (
                    <div key={l.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="text-[10px] font-black text-admin-primary/60 uppercase tracking-widest">{l.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-admin-primary">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-admin-muted/40 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full" 
                          style={{ backgroundColor: colors[i % colors.length] }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-admin-border/40 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden group">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-admin-primary/5 flex items-center justify-center">
                <PieChartIcon className="h-4 w-4 text-admin-primary" />
              </div>
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Status das Solicitações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-12">
              <div className="h-[200px] w-1/2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={quoteStatusData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" cy="50%" 
                      innerRadius={60} outerRadius={85}
                      paddingAngle={8}
                    >
                      {quoteStatusData.map((_, i) => (
                        <Cell 
                          key={i} 
                          fill={colors[i % colors.length]} 
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-admin-primary tracking-tighter">
                    {quoteStatusData.reduce((sum, d) => sum + d.value, 0)}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Solicitações</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[180px] custom-scrollbar pr-2">
                {quoteStatusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-2 border-b border-admin-border/20 last:border-0 group/item">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-[10px] font-black text-admin-primary/50 uppercase tracking-widest group-hover/item:text-admin-primary transition-colors">{s.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-admin-primary tabular-nums">{s.value}</span>
                      <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-tighter">B2C:{s.b2c} · B2B:{s.b2b}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
