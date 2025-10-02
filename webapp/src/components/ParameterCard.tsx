import { Card } from "@/ui/Card";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "./StatusIndicator";

interface ParameterCardProps {
  title: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical";
  min: string;
  max: string;
  trend?: "up" | "down" | "stable";
}

export const ParameterCard = ({ title, value, unit, status, min, max, trend = "stable" }: ParameterCardProps) => {
  const trendIcons = {
    up: "�",
    down: "�",
    stable: "�",
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    stable: "text-muted-foreground",
  };

  return (
    <Card className="bg-card border-border shadow-card p-6 hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        <StatusIndicator status={status} label={status} />
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-bold font-mono tabular-nums text-foreground">{value}</span>
        <span className="text-xl text-muted-foreground">{unit}</span>
        <span className={cn("text-2xl ml-auto", trendColors[trend])}>{trendIcons[trend]}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Min: <span className="font-mono">{min}</span></span>
        <span>Max: <span className="font-mono">{max}</span></span>
      </div>

      <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", {
            "bg-success": status === "normal",
            "bg-warning": status === "warning",
            "bg-destructive": status === "critical",
          })}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      </div>
    </Card>
  );
};
