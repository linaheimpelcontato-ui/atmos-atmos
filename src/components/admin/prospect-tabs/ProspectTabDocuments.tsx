import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Download, Loader2 } from "lucide-react";
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
    const { data, error } = await supabase.storage.from("assets").list(basePath);
    if (error) return;
    const mapped = (data ?? [])
      .filter(f => f.name !== ".emptyFolderPlaceholder")
      .map(f => ({
        name: f.name,
        url: supabase.storage.from("assets").getPublicUrl(`${basePath}/${f.name}`).data.publicUrl,
      }));
    setFiles(mapped);
  }, [basePath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filePath = `${basePath}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("assets").upload(filePath, file);
    if (error) {
      toast({ title: "Erro ao fazer upload", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo enviado!" });
      fetchFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase.storage.from("assets").remove([`${basePath}/${name}`]);
    if (!error) {
      toast({ title: "Arquivo removido" });
      fetchFiles();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Documentos ({files.length})</h3>
        <label>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" variant="outline" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
              Upload
            </span>
          </Button>
        </label>
      </div>

      {files.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum documento anexado.</p>
      )}

      <div className="space-y-2">
        {files.map(f => (
          <div key={f.name} className="flex items-center gap-3 border border-border rounded-lg p-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1 truncate">{f.name.replace(/^\d+-/, "")}</span>
            <a href={f.url} target="_blank" rel="noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover Arquivo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover o arquivo <strong>{f.name.replace(/^\d+-/, "")}</strong>? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDelete(f.name)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
