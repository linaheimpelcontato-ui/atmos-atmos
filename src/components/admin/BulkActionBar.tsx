import { useState } from "react";
import { Trash2, Download, PenLine, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface BulkField {
  key: string;
  label: string;
  type: "text" | "select" | "boolean" | "number";
  options?: { value: string; label: string }[];
  isVariable?: boolean;
}

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onDuplicate?: () => void;
  bulkFields?: BulkField[];
  onBulkUpdate?: (field: string, value: unknown) => void;
}

export default function BulkActionBar({
  count,
  onClear,
  onDelete,
  onExport,
  onDuplicate,
  bulkFields,
  onBulkUpdate,
}: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [fieldValue, setFieldValue] = useState<unknown>("");

  if (count === 0) return null;

  const currentFieldDef = bulkFields?.find(f => f.key === selectedField);

  const handleApplyField = () => {
    if (selectedField && onBulkUpdate) {
      onBulkUpdate(selectedField, fieldValue);
    }
    setFieldDialogOpen(false);
    setSelectedField("");
    setFieldValue("");
  };

  return (
    <>
      <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3 text-sm animate-in slide-in-from-bottom-4 duration-200">
          <span className="font-medium">{count} selecionado{count > 1 ? "s" : ""}</span>

          <div className="h-4 w-px bg-primary-foreground/30" />

          {onExport && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={onExport}>
              <Download className="h-3 w-3" /> Exportar
            </Button>
          )}

          {onDuplicate && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={onDuplicate}>
              <Copy className="h-3 w-3" /> Duplicar
            </Button>
          )}

          {bulkFields && bulkFields.length > 0 && onBulkUpdate && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setSelectedField(""); setFieldValue(""); setFieldDialogOpen(true); }}
            >
              <PenLine className="h-3 w-3" /> Preencher
            </Button>
          )}

          {onDelete && (
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          )}

          <Button size="icon" variant="ghost" className="h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {count} item{count > 1 ? "ns" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDelete?.(); setDeleteOpen(false); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk field update dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Preencher campo em massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campo</Label>
              <Select value={selectedField} onValueChange={(v) => { setSelectedField(v); setFieldValue(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o campo" /></SelectTrigger>
                <SelectContent side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-52">
                  {bulkFields?.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentFieldDef && (
              <div className="space-y-2">
                <Label>Valor</Label>
                {currentFieldDef.type === "select" && currentFieldDef.options ? (
                  <Select value={String(fieldValue)} onValueChange={setFieldValue}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4} avoidCollisions={false}>
                      {currentFieldDef.options.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : currentFieldDef.type === "boolean" ? (
                  <div className="flex items-center gap-2">
                    <Switch checked={!!fieldValue} onCheckedChange={setFieldValue} />
                    <span className="text-sm">{fieldValue ? "Sim" : "Não"}</span>
                  </div>
                ) : currentFieldDef.type === "number" ? (
                  <Input type="number" step="0.01" value={String(fieldValue)} onChange={(e) => setFieldValue(e.target.value)} placeholder="Novo valor" />
                ) : (
                  <Input value={String(fieldValue)} onChange={(e) => setFieldValue(e.target.value)} placeholder="Novo valor" />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyField} disabled={!selectedField}>
              Aplicar a {count} item{count > 1 ? "ns" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
