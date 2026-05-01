import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Heart, FileText } from "lucide-react";
import { AtmosTable, AtmosColumn } from "../shared/AtmosTable";
import { format } from "date-fns";

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
      render: (q) => <span className="font-bold text-admin-primary">{q.user_name || "—"}</span>
    },
    { 
      header: "Email", 
      key: "user_email",
      render: (q) => <span className="text-muted-foreground/60">{q.user_email || "—"}</span>
    },
    { 
      header: "Status", 
      key: "status",
      render: (q) => (
        <Badge variant="secondary" className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${statusColor(q.status)}`}>
          {q.status === "pending" ? "Pendente" : q.status === "contacted" ? "Contatado" : q.status === "closed" ? "Fechado" : q.status}
        </Badge>
      )
    },
    { 
      header: "Data", 
      key: "created_at",
      align: "right",
      render: (q) => <span className="text-muted-foreground/60">{format(new Date(q.created_at), "dd/MM/yy")}</span>
    }
  ];

  const productColumns: AtmosColumn<any>[] = [
    { 
      header: "Produto", 
      key: "name",
      render: (p) => <span className="font-bold text-admin-primary">{p.name}</span>
    },
    { 
      header: "Tipo", 
      key: "type",
      render: (p) => (
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-admin-border/60">
          {typeLabel[p.type] || p.type}
        </Badge>
      )
    },
    { 
      header: "Salvos", 
      key: "saves",
      align: "right",
      render: (p) => <span className="font-black text-admin-primary">{p.saves}</span>
    }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-xl bg-admin-muted flex items-center justify-center">
              <FileText className="h-4 w-4 text-admin-primary" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Últimas Solicitações</h3>
          </div>
          <Link to="/admin/b2c/solicitacoes" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-admin-primary transition-colors flex items-center gap-2 group">
            Ver todas <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <AtmosTable 
          data={latestQuotes}
          columns={quoteColumns}
          emptyMessage="Nenhuma solicitação pendente."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-xl bg-admin-muted flex items-center justify-center">
              <Heart className="h-4 w-4 text-admin-primary" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Top Wishlist</h3>
          </div>
          <Link to="/admin/produtos" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-admin-primary transition-colors flex items-center gap-2 group">
            Ver catálogo <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <AtmosTable 
          data={topProducts.slice(0, 10)}
          columns={productColumns}
          emptyMessage="Nenhum produto salvo ainda."
        />
      </div>
    </div>
  );
}
