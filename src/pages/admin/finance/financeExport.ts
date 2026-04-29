import * as XLSX from "xlsx";
import { fmt } from "./financeCalcs";

function toSheet(headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  return ws;
}

export function exportOverview(data: any, monthlyData: any[]) {
  const wb = XLSX.utils.book_new();

  // KPIs sheet
  const kpiRows = [
    ["Faturamento", data.revenue],
    ["Custo Total", data.totalCost],
    ["Lucro Líquido", data.profit],
    ["Margem %", data.margin],
    ["ROI %", data.roi],
    ["Nº Clientes", data.clients],
    ["Ticket Médio", data.avgTicket],
    ["Ticket B2C", data.ticketB2C],
    ["Ticket B2B", data.ticketB2B],
    ["Taxa Cancelamento %", data.cancelRate],
  ];
  XLSX.utils.book_append_sheet(wb, toSheet(["Indicador", "Valor"], kpiRows), "KPIs");

  // Monthly
  const monthRows = monthlyData.map(m => [m.name, m.receita, m.custos, m.lucro, m.clientes]);
  XLSX.utils.book_append_sheet(wb, toSheet(["Mês", "Receita", "Custos", "Lucro", "Clientes"], monthRows), "Mensal");

  XLSX.writeFile(wb, "relatorio-financeiro.xlsx");
}

export function exportGuideRanking(data: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = data.map(g => [g.name, g.proposals, g.revenue, g.guideCost, g.profit, g.margin.toFixed(1), g.roi.toFixed(1), g.avgTicket]);
  XLSX.utils.book_append_sheet(wb, toSheet(
    ["Guia", "Propostas", "Faturamento", "Custo Guia", "Lucro", "Margem %", "ROI %", "Ticket Médio"], rows
  ), "Ranking Guias");
  XLSX.writeFile(wb, "ranking-guias.xlsx");
}

export function exportCategories(data: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = data.map(c => [c.category, c.revenue, c.count, c.percent.toFixed(1)]);
  XLSX.utils.book_append_sheet(wb, toSheet(["Categoria", "Faturamento", "Qtd", "% do Total"], rows), "Categorias");
  XLSX.writeFile(wb, "categorias-financeiro.xlsx");
}

export function exportProducts(data: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = data.map(p => [p.name, p.category, p.count, p.revenue, p.avgTicket]);
  XLSX.utils.book_append_sheet(wb, toSheet(["Item", "Categoria", "Vendas", "Faturamento", "Ticket Médio"], rows), "Produtos");
  XLSX.writeFile(wb, "produtos-financeiro.xlsx");
}

export function exportCashFlow(data: any[]) {
  const wb = XLSX.utils.book_new();
  const rows = data.map(m => [m.name, m.entradas, m.saidas, m.saldo]);
  XLSX.utils.book_append_sheet(wb, toSheet(["Mês", "Entradas", "Saídas", "Saldo"], rows), "Fluxo de Caixa");
  XLSX.writeFile(wb, "fluxo-caixa.xlsx");
}
