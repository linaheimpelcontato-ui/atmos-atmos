import { Settings } from "lucide-react";
import TeamTab from "@/components/admin/settings/TeamTab";

export default function AdminSettings() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Configurações</h1>
      </div>
      <TeamTab />
    </div>
  );
}
