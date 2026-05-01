import { cn } from "@/lib/utils";

interface AtmosCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function AtmosCard({ title, subtitle, headerAction, children, className, ...props }: AtmosCardProps) {
  return (
    <div 
      className={cn(
        "bg-white dark:bg-admin-surface border border-admin-border rounded-[2rem] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col transition-all",
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-5 border-b border-admin-border/50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <div>
            {title && <h3 className="text-lg font-black uppercase tracking-widest text-admin-primary dark:text-white leading-none">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground font-medium mt-1.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}
