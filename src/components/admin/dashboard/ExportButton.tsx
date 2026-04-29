import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  disabled?: boolean;
}

export default function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const handleExport = () => {
    if (!data.length) return;
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || !data.length}
      className="h-8 text-xs gap-2"
    >
      <Download className="h-3.5 w-3.5" />
      Exportar Excel
    </Button>
  );
}
