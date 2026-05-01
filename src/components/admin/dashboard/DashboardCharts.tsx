import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts";
import { Globe } from "lucide-react";
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
  return (
    <div className="space-y-6">
      {/* Main Trend Chart */}
      <Card className="admin-card border-none shadow-sm overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-admin-primary rounded-full" />
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Crescimento ao Longo do Tempo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradB2C" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={B2C_COLOR} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={B2C_COLOR} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradB2B" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={B2B_COLOR} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={B2B_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "rgba(0,0,0,0.3)" }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "rgba(0,0,0,0.3)" }} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "16px", 
                    border: "none", 
                    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                    padding: "12px 16px"
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="usuarios" 
                  stroke={B2C_COLOR} 
                  fill="url(#gradB2C)" 
                  strokeWidth={3} 
                  name="B2C (Usuários)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="b2b" 
                  stroke={B2B_COLOR} 
                  fill="url(#gradB2B)" 
                  strokeWidth={3} 
                  name="B2B (Imersões)" 
                  animationDuration={1500}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: "20px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="admin-card border-none shadow-sm">
          <CardHeader className="px-8 pt-8 pb-6 border-b border-admin-border/30">
             <div className="flex items-center gap-3">
              <div className="h-6 w-3 rounded-full bg-emerald-500" />
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Funil de Conversão B2C</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {funnelB2C.map((f, i) => (
              <div key={f.step} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black uppercase tracking-widest text-admin-primary/60">{f.step}</span>
                  <span className="text-xs font-black text-admin-primary">{f.value} <span className="text-muted-foreground/40 text-[10px]">({f.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-3 bg-admin-muted rounded-full overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(f.pct, 2)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: B2C_COLOR, opacity: 1 - i * 0.15 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="admin-card border-none shadow-sm">
          <CardHeader className="px-8 pt-8 pb-6 border-b border-admin-border/30">
            <div className="flex items-center gap-3">
              <div className="h-6 w-3 rounded-full bg-blue-500" />
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Funil de Conversão B2B</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {funnelB2B.map((f, i) => (
              <div key={f.step} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black uppercase tracking-widest text-admin-primary/60">{f.step}</span>
                  <span className="text-xs font-black text-admin-primary">{f.value} <span className="text-muted-foreground/40 text-[10px]">({f.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-3 bg-admin-muted rounded-full overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(f.pct, 2)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: B2B_COLOR, opacity: 1 - i * 0.15 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="admin-card border-none shadow-sm">
          <CardHeader className="px-8 pt-8 pb-4">
             <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-admin-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Idiomas dos Usuários</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="flex items-center gap-8">
              <div className="h-[180px] w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={langData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" cy="50%" 
                      innerRadius={45} outerRadius={70}
                      paddingAngle={5}
                    >
                      {langData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {langData.map((l, i) => {
                  const total = langData.reduce((s, d) => s + d.value, 0);
                  return (
                    <div key={l.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="text-[11px] font-black text-admin-primary/70 uppercase tracking-wider">{l.name}</span>
                        </div>
                        <span className="text-[11px] font-black text-admin-primary">{((l.value / total) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-admin-muted rounded-full overflow-hidden">
                        <div className="h-full bg-current rounded-full" style={{ width: `${(l.value / total) * 100}%`, backgroundColor: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card border-none shadow-sm">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Status das Solicitações</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="flex items-center gap-8">
              <div className="h-[180px] w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={quoteStatusData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" cy="50%" 
                      innerRadius={45} outerRadius={70}
                      paddingAngle={5}
                    >
                      {quoteStatusData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                {quoteStatusData.map((s, i) => {
                  const total = quoteStatusData.reduce((sum, d) => sum + d.value, 0);
                  return (
                    <div key={s.name} className="flex items-center justify-between py-1 border-b border-admin-border/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-[10px] font-bold text-admin-primary/60 uppercase tracking-wider">{s.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-admin-primary">{s.value}</span>
                        <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">B2C:{s.b2c} B2B:{s.b2b}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
