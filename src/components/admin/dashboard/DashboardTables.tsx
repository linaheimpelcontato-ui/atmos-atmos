import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Heart, FileText } from "lucide-react";
import { AtmosTable, AtmosColumn } from "../shared/AtmosTable";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface DashboardTablesProps {
  latestQuotes: any[];
  topProducts: any[];
  statusColor: (s: string) => string;
  typeLabel: Record<string, string>;
}

export function DashboardTables({ 
  latestQuotes, 
  topProducts, 
  statusColor, 
  typeLabel 
 }: DashboardTablesProps) {
  
  const quoteColumns: AtmosColumn<any>[] = [
    { 
      header: "Nome", 
      key: "user_name",
      render: (q) => <span className="font-black text-admin-primary tracking-tight">{q.user_name || "—"}</span>
    },
    { 
      header: "Email", 
      key: "user_email",
      render: (q) => <span className="text-[11px] font-bold text-muted-foreground/40">{q.user_email || "—"}</span>
    },
    { 
      header: "Status", 
      key: "status",
      render: (q) => (
        <Badge variant="secondary" className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border-none shadow-sm ${statusColor(q.status)}`}>
          {q.status === "pending" ? "Pendente" : q.status === "contacted" ? "Contatado" : q.status === "closed" ? "Fechado" : q.status}
        </Badge>
      )
    },
    { 
      header: "Data", 
      key: "created_at",
      align: "right",
      render: (q) => <span className="text-[10px] font-black text-muted-foreground/30 uppercase">{format(new Date(q.created_at), "dd MMM yy")}</span>
    }
  ];

  const productColumns: AtmosColumn<any>[] = [
    { 
      header: "Produto", 
      key: "name",
      render: (p) => <span className="font-black text-admin-primary tracking-tight">{p.name}</span>
    },
    { 
      header: "Tipo", 
      key: "type",
      render: (p) => (
        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-admin-border/40 text-muted-foreground/60 px-2.5 py-1 rounded-lg bg-white/50 shadow-sm">
          {typeLabel[p.type] || p.type}
        </Badge>
      )
    },
    { 
      header: "Salvos", 
      key: "saves",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-black text-admin-primary tabular-nums">{p.saves}</span>
          <Heart className="h-3 w-3 text-rose-400 fill-rose-400/20" />
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-admin-primary/5 flex items-center justify-center">
              <FileText className="h-5 w-5 text-admin-primary" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Últimas Solicitações</h3>
              <p className="text-[9px] font-medium text-muted-foreground/40 italic">Novos leads e pedidos de orçamento</p>
            </div>
          </div>
          <Link to="/admin/b2c/solicitacoes" className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-admin-primary transition-all flex items-center gap-2 group">
            Ver todas <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-admin-border/40 shadow-sm overflow-hidden">
          <AtmosTable 
            data={latestQuotes}
            columns={quoteColumns}
            emptyMessage="Nenhuma solicitação pendente."
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-admin-primary/5 flex items-center justify-center">
              <Heart className="h-5 w-5 text-admin-primary" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-admin-primary">Top Wishlist</h3>
              <p className="text-[9px] font-medium text-muted-foreground/40 italic">Produtos mais salvos pelos usuários</p>
            </div>
          </div>
          <Link to="/admin/produtos" className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-admin-primary transition-all flex items-center gap-2 group">
            Ver catálogo <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-admin-border/40 shadow-sm overflow-hidden">
          <AtmosTable 
            data={topProducts.slice(0, 10)}
            columns={productColumns}
            emptyMessage="Nenhum produto salvo ainda."
          />
        </div>
      </motion.div>
    </div>
  );
}
