import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, Users, X, Check } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ALL_MODULES = [
  { key: "site", label: "Site" },
  { key: "cadastros", label: "Cadastros" },
  { key: "b2c", label: "B2C Turistas" },
  { key: "b2b", label: "B2B Imersões" },
  { key: "financeiro", label: "Financeiro" },
  { key: "ferramentas", label: "Ferramentas" },
  { key: "configuracoes", label: "Configurações" },
];

interface AdminRow {
  user_id: string;
  email: string;
  full_name: string | null;
  allowed_modules: string[];
}

export default function TeamTab() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newModules, setNewModules] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "list" },
      });
      if (error || !data?.admins) {
        setAdmins([]);
        return;
      }
      setAdmins(data.admins);
    } catch {
      setAdmins([]);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const toggleNewModule = (mod: string) => {
    setNewModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const toggleEditModule = (mod: string) => {
    setEditModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };


  const handleAddAdmin = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "add", email, allowed_modules: newModules },
      });

      let errMsg = data?.error;
      if (!errMsg && error) {
        try {
          const body = typeof (error as any)?.context?.body === 'string' ? JSON.parse((error as any).context.body) : null;
          errMsg = body?.error || error.message;
        } catch { errMsg = error.message; }
      }

      if (error || data?.error) {
        toast({ title: "Erro", description: errMsg || "Erro ao adicionar admin", variant: "destructive" });
      } else {
        toast({ title: "Admin adicionado com sucesso!" });
        setNewEmail("");
        setNewModules([]);
        fetchAdmins();
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha na requisição", variant: "destructive" });
    }
    setLoading(false);
  };

  const removeAdmin = async (userId: string) => {

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "remove", user_id: userId },
      });

      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Admin removido" });
        fetchAdmins();
      }
    } catch {
      toast({ title: "Erro", description: "Falha na requisição", variant: "destructive" });
    }
  };

  const startEdit = (admin: AdminRow) => {
    setEditingId(admin.user_id);
    setEditModules([...admin.allowed_modules]);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await db
      .from("admin_permissions")
      .update({ allowed_modules: editModules })
      .eq("user_id", editingId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permissões atualizadas!" });
      setEditingId(null);
      fetchAdmins();
    }
  };

  const getModuleLabels = (modules: string[]) => {
    if (!modules.length) return "Acesso total";
    return modules.map(m => ALL_MODULES.find(am => am.key === m)?.label ?? m).join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Equipe Administrativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new admin */}
        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Adicionar novo admin</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Email do usuário</Label>
              <Input
                className="h-8 text-sm"
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Se o email não tiver cadastro, um convite será enviado automaticamente.</p>
            </div>
            <Button size="sm" onClick={handleAddAdmin} disabled={loading || !newEmail.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Módulos permitidos (vazio = acesso total)</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_MODULES.map(mod => (
                <label key={mod.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={newModules.includes(mod.key)}
                    onCheckedChange={() => toggleNewModule(mod.key)}
                  />
                  {mod.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Admin list */}
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum admin cadastrado.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Módulos</th>
                  <th className="p-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.user_id} className="border-t border-border">
                    <td className="p-2">
                      <div>{admin.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{admin.email || admin.user_id.slice(0, 8) + "..."}</div>
                    </td>
                    <td className="p-2">
                      {editingId === admin.user_id ? (
                        <div className="flex flex-wrap gap-2">
                          {ALL_MODULES.map(mod => (
                            <label key={mod.key} className="flex items-center gap-1 text-xs cursor-pointer">
                              <Checkbox
                                checked={editModules.includes(mod.key)}
                                onCheckedChange={() => toggleEditModule(mod.key)}
                              />
                              {mod.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {getModuleLabels(admin.allowed_modules)}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {editingId === admin.user_id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveEdit}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(admin)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Administrador?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover o acesso de <strong>{admin.full_name || admin.email}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => removeAdmin(admin.user_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
