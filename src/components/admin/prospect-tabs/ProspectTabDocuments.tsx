import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Download, Loader2 } from "lucide-react";
import { r2 } from "@/lib/r2";
import { storageUrl } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function ProspectTabDocuments({ prospectId }: { prospectId: string }) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const basePath = `prospect-docs/${prospectId}`;

  const fetchFiles = useCallback(async () => {
    try {
      const data = await r2.list(basePath);
      const mapped = (data ?? [])
        .map((f: any) => ({
          name: f.Key.split('/').pop(),
          url: storageUrl(f.Key),
        }))
        .filter(f => f.name !== ".emptyFolderPlaceholder");
      setFiles(mapped);
    } catch (err) {
      console.error(err);
    }
  }, [basePath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    try {
      await r2.upload(basePath, fileName, file);
      toast({ title: "Arquivo enviado para Cloudflare!" });
      fetchFiles();
    } catch (err: any) {
      toast({ title: "Erro ao fazer upload", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (name: string) => {
    try {
      await r2.delete(basePath, name);
      toast({ title: "Arquivo removido do Cloudflare" });
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary leading-none">Repositório Digital</h3>
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">Documentos & Ativos ({files.length})</p>
        </div>
        <label>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" asChild disabled={uploading} className="h-11 rounded-xl px-8 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-admin-primary/10 transition-all hover:scale-[1.02]">
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Fazer Upload
            </span>
          </Button>
        </label>
      </div>

      {files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-[3rem] border border-dashed border-admin-border/40 bg-white shadow-sm">
          <div className="p-6 bg-admin-primary/5 rounded-full mb-4">
            <FileText className="h-10 w-10 text-admin-primary/20" />
          </div>
          <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Nenhum documento anexado</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {files.map(f => (
          <div key={f.name} className="flex items-center gap-6 p-5 rounded-[2rem] border border-admin-border/30 bg-white hover:border-admin-primary/20 transition-all group shadow-sm hover:shadow-md">
            <div className="p-4 rounded-2xl bg-white border border-admin-border/40 text-admin-primary shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-6 w-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-black text-admin-primary uppercase tracking-[0.2em] truncate block mb-1">{f.name.replace(/^\d+-/, "")}</span>
              <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Armazenamento Cloudflare R2</p>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-admin-primary/5 text-admin-primary" asChild>
                <a href={f.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-admin-border/40 p-8">
                  <AlertDialogHeader className="space-y-4">
                    <AlertDialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-admin-primary">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                      Esta ação removerá permanentemente o arquivo "{f.name.replace(/^\d+-/, "")}" do repositório digital da Atmos. Esta operação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="pt-6">
                    <AlertDialogCancel className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 border-admin-border/60">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(f.name)} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 bg-red-500 hover:bg-red-600 border-none">
                      Remover Arquivo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
