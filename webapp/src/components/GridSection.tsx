import { Card } from "@/ui/Card";
import { cn } from "@/lib/utils";

interface GridSectionProps {
  name: string;
  status: "normal" | "warning" | "critical";
  load: number;
  capacity: number;
}

export const GridSection = ({ name, status, load, capacity }: GridSectionProps) => {
  const percentage = (load / capacity) * 100;

  const statusStyles = {
    normal: "border-success/50 bg-success/5",
    warning: "border-warning/50 bg-warning/5",
    critical: "border-destructive/50 bg-destructive/5",
  };

  const statusColors = {
    normal: "text-success",
    warning: "text-warning",
    critical: "text-destructive",
  };

  return (
    <Card className={cn("p-4 border-2 transition-all duration-300", statusStyles[status])}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">{name}</h4>
        <span className={cn("text-xs uppercase font-bold", statusColors[status])}>{status}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Load</span>
          <span className="font-mono font-semibold">{load.toFixed(1)} MW</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Capacity</span>
          <span className="font-mono">{capacity} MW</span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Utilization</span>
            <span className={cn("font-semibold", statusColors[status])}>{percentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500 rounded-full", {
                "bg-success": status === "normal",
                "bg-warning": status === "warning",
                "bg-destructive": status === "critical",
              })}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
