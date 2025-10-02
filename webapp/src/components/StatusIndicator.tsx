import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "normal" | "warning" | "critical";
  label: string;
  className?: string;
}

export const StatusIndicator = ({ status, label, className }: StatusIndicatorProps) => {
  const statusColors = {
    normal: "bg-success",
    warning: "bg-warning",
    critical: "bg-destructive",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />
        <div className={cn("absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75", statusColors[status])} />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};
