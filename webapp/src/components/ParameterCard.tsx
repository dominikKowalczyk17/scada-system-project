import { Card } from "@/ui/Card";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "./StatusIndicator";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  }[trend];

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    stable: "text-muted-foreground",
  };

  // Calculate percentage for progress bar
  const numValue = parseFloat(value);
  const numMin = parseFloat(min);
  const numMax = parseFloat(max);
  const range = numMax - numMin;
  const percentage =
    range === 0
      ? 0
      : Math.min(100, Math.max(0, ((numValue - numMin) / range) * 100));

  return (
    <Card className="bg-card border-border shadow-card p-4 sm:p-6 hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        <StatusIndicator status={status} label={status} />
      </div>

      <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono tabular-nums text-foreground">{value}</span>
        <span className="text-base sm:text-lg lg:text-xl text-muted-foreground">{unit}</span>
        <TrendIcon className={cn("w-5 h-5 sm:w-6 sm:h-6 ml-auto", trendColors[trend])} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Min: <span className="font-mono">{min}</span></span>
        <span>Max: <span className="font-mono">{max}</span></span>
      </div>

      <div className="mt-2 sm:mt-3 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", {
            "bg-success": status === "normal",
            "bg-warning": status === "warning",
            "bg-destructive": status === "critical",
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
};
