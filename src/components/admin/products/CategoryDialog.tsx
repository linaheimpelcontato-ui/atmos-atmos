import { useState } from "react";
import { Plus, X, FolderPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify, BASE_CATEGORY_FIELDS, saveCustomTypeFields, getCustomTypeFields, type FieldDef } from "./shared";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string, name: string) => void;
}

export function CategoryDialog({ open, onOpenChange, onCreated }: CategoryDialogProps) {
  const [catName, setCatName] = useState("");
  const [catFields, setCatFields] = useState<{ name: string; type: "text" | "number" | "percent" }[]>([]);

  const handleCreate = () => {
    const slug = slugify(catName);
    if (!slug) return;

    // Save custom fields — always include base fields + user custom fields
    const custom = getCustomTypeFields();
    const baseKeys = BASE_CATEGORY_FIELDS.map((f) => f.key);
    const userFields: FieldDef[] = catFields
      .filter((f) => f.name.trim())
      .map((f) => ({ key: slugify(f.name), label: f.name, type: f.type }));
    
    // Merge base + custom, avoiding duplicates
    const merged: FieldDef[] = [
      ...BASE_CATEGORY_FIELDS,
      ...userFields.filter((f) => !baseKeys.includes(f.key)),
    ];
    
    custom[slug] = merged;
    saveCustomTypeFields(custom);
    
    onCreated(slug, catName);
    onOpenChange(false);
    setCatName("");
    setCatFields([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 bg-admin-muted/30">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-admin-primary">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <FolderPlus className="h-5 w-5 text-admin-primary" />
            </div>
            Nova Categoria
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-8 space-y-8">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome da Categoria</Label>
            <Input 
              value={catName} 
              onChange={(e) => setCatName(e.target.value)} 
              placeholder="Ex: Passeios de Barco" 
              className="h-12 bg-admin-bg border-admin-border rounded-xl focus:ring-2 focus:ring-admin-primary/10 transition-all font-medium"
              autoFocus 
            />
            {catName && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 ml-1 opacity-60">
                IDENTIFICADOR: {slugify(catName)}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Campos Adicionais</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setCatFields([...catFields, { name: "", type: "text" }])}
                className="h-7 text-[10px] font-bold uppercase tracking-wider text-admin-primary hover:bg-admin-primary/5"
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar Campo
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-relaxed bg-admin-bg p-3 rounded-xl border border-admin-border/50">
              Campos padrão como <span className="font-bold text-admin-primary">Empresa, Contato, Telefone e Comissão</span> já estão incluídos automaticamente.
            </p>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {catFields.map((f, i) => (
                <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-200">
                  <Input
                    value={f.name}
                    onChange={(e) => { const nf = [...catFields]; nf[i].name = e.target.value; setCatFields(nf); }}
                    placeholder="Ex: Motor"
                    className="flex-1 h-10 bg-white border-admin-border rounded-xl text-sm"
                  />
                  <Select value={f.type} onValueChange={(v) => { const nf = [...catFields]; nf[i].type = v as any; setCatFields(nf); }}>
                    <SelectTrigger className="w-32 h-10 bg-white border-admin-border rounded-xl text-xs font-semibold uppercase tracking-wider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border shadow-2xl">
                      <SelectItem value="text" className="text-xs font-bold uppercase tracking-wider">Texto</SelectItem>
                      <SelectItem value="number" className="text-xs font-bold uppercase tracking-wider">Número</SelectItem>
                      <SelectItem value="percent" className="text-xs font-bold uppercase tracking-wider">Porcentagem</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setCatFields(catFields.filter((_, j) => j !== i))}
                    className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-admin-bg border-t border-admin-border/50 gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-admin-primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!catName.trim()} 
            className="h-12 px-10 bg-admin-primary hover:bg-black text-white rounded-xl shadow-lg shadow-admin-primary/20 font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Criar Categoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
