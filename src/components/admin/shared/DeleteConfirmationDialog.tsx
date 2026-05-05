import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemCount?: number;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Excluir Item",
  description = "Esta ação não pode ser desfeita. O item será removido permanentemente do catálogo.",
  itemCount,
  isLoading
}: DeleteConfirmationDialogProps) {
  const displayTitle = itemCount && itemCount > 1 ? `Excluir ${itemCount} Itens` : title;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#FAF9F6] border-admin-border/40 max-w-md rounded-[32px] p-8 shadow-2xl">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2 shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <AlertDialogTitle className="text-2xl font-display text-admin-primary uppercase tracking-[0.15em]">
            {displayTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-admin-primary/60 leading-relaxed font-medium">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8 sm:justify-center">
          <AlertDialogCancel asChild>
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-2xl border-admin-border/60 text-admin-primary font-bold uppercase tracking-widest text-[10px] hover:bg-admin-muted/50 transition-all active:scale-95 shadow-sm"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={isLoading}
              className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-red-500/20 flex gap-2"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Confirmar Exclusão
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
