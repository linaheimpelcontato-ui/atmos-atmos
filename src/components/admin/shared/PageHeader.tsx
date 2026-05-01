import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 pt-2", className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-3.5 bg-white border border-admin-border rounded-2xl shadow-sm text-admin-primary">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-admin-primary dark:text-white">{title}</h1>
          {subtitle && <p className="text-[15px] font-medium text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
